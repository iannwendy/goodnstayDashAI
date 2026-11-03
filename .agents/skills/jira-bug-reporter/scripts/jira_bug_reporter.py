#!/usr/bin/env python3
"""goodNstay QA — Jira Cloud Bug Reporter with Automatic Inline Screenshot Upload.

Zero-dependency CLI & module using Python 3 standard library.
"""

from __future__ import annotations

import argparse
import base64
from dataclasses import dataclass, field
import json
import mimetypes
import os
import pathlib
import re
import struct
import sys
import time
from typing import Any
import urllib.error
from urllib.parse import parse_qs, quote, urlencode, urlparse
import urllib.request
import uuid

REPO_ROOT = pathlib.Path(__file__).resolve().parents[4]
DEFAULT_CLASSIFICATION = "Needs Verification — (need to brainstorming with team or observe)"
PLACEHOLDER_TOKENS = {
    "",
    "PASTE_YOUR_ATLASSIAN_API_TOKEN_HERE",
    "YOUR_API_TOKEN",
    "<YOUR_API_TOKEN>",
}
MEDIA_UUID_RE = re.compile(
    r"/file/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:/|$|\?)"
)


class JiraReporterError(Exception):
    """Base error for Jira Bug Reporter."""


class ConfigError(JiraReporterError):
    """Raised when Jira credentials or configuration are missing or invalid."""


class ValidationError(JiraReporterError):
    """Raised when a bug report payload violates goodNstay QA template rules."""


class JiraApiError(JiraReporterError):
    """Raised when Jira Cloud REST API returns an unexpected HTTP error."""


@dataclass
class JiraConfig:
    base_url: str
    email: str
    api_token: str
    project_name: str = "Internship Program 2026"
    project_key: str = ""
    issue_type: str = "Bug"
    auto_assign_self: bool = True


@dataclass
class BugReport:
    title: str
    environment: str
    steps_to_reproduce: list[str]
    actual_result: str
    expected_result: str
    evidence: dict[str, str]
    classification: str = DEFAULT_CLASSIFICATION
    severity: str = ""
    priority_label: str = ""
    reproducibility: str = ""
    test_account: str = ""
    labels: list[str] = field(default_factory=list)
    jira_fields: dict[str, Any] = field(default_factory=dict)
    attachments: list[pathlib.Path] = field(default_factory=list)


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _is_http_url(val: str) -> bool:
    return val.startswith(("http://", "https://"))


def _read_image_dimensions(path: pathlib.Path) -> tuple[int, int]:
    """Extract (width, height) from PNG, GIF, JPEG, or WebP headers using stdlib."""
    try:
        with path.open("rb") as fh:
            header = fh.read(64)
            if len(header) >= 24 and header[:8] == b"\x89PNG\r\n\x1a\n" and header[12:16] == b"IHDR":
                w, h = struct.unpack(">II", header[16:24])
                if w > 0 and h > 0:
                    return int(w), int(h)

            if len(header) >= 10 and header[:6] in (b"GIF87a", b"GIF89a"):
                w, h = struct.unpack("<HH", header[6:10])
                if w > 0 and h > 0:
                    return int(w), int(h)

            if len(header) >= 30 and header[:4] == b"RIFF" and header[8:12] == b"WEBP":
                chunk = header[12:16]
                if chunk == b"VP8X" and len(header) >= 30:
                    w = 1 + int.from_bytes(header[24:27], "little")
                    h = 1 + int.from_bytes(header[27:30], "little")
                    return w, h
                if chunk == b"VP8L" and len(header) >= 25:
                    bits = struct.unpack("<I", header[21:25])[0]
                    w = (bits & 0x3FFF) + 1
                    h = ((bits >> 14) & 0x3FFF) + 1
                    return w, h
                if chunk == b"VP8 " and len(header) >= 30:
                    w, h = struct.unpack("<HH", header[26:30])
                    return int(w & 0x3FFF), int(h & 0x3FFF)

            if len(header) >= 4 and header[:2] == b"\xff\xd8":
                fh.seek(2)
                sof_markers = {
                    0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                    0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
                }
                while True:
                    b = fh.read(1)
                    if not b:
                        break
                    if b != b"\xff":
                        continue
                    while b == b"\xff":
                        b = fh.read(1)
                    if not b:
                        break
                    marker = b[0]
                    if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                        continue
                    seg_len_bytes = fh.read(2)
                    if len(seg_len_bytes) < 2:
                        break
                    seg_len = struct.unpack(">H", seg_len_bytes)[0]
                    if marker in sof_markers:
                        sof = fh.read(5)
                        if len(sof) == 5:
                            _, h, w = struct.unpack(">BHH", sof)
                            if w > 0 and h > 0:
                                return int(w), int(h)
                        break
                    if seg_len < 2:
                        break
                    fh.seek(seg_len - 2, os.SEEK_CUR)
    except OSError:
        pass
    return 1280, 720


def _parse_dotenv(path: pathlib.Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):].strip()
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        values[key] = val
    return values


def default_env_paths(workspace_dir: pathlib.Path | None = None) -> list[pathlib.Path]:
    cwd_root = (workspace_dir or pathlib.Path.cwd()).resolve()
    candidates = [
        cwd_root / ".env.jira",
        cwd_root / ".env",
        REPO_ROOT / ".env.jira",
        REPO_ROOT / ".env",
    ]
    deduped: list[pathlib.Path] = []
    seen: set[pathlib.Path] = set()
    for p in candidates:
        if p not in seen:
            seen.add(p)
            deduped.append(p)
    return deduped


def load_config(
    env_paths: list[pathlib.Path] | None = None,
    ignore_os_env: bool = False,
) -> JiraConfig:
    merged: dict[str, str] = {}
    paths = env_paths if env_paths is not None else default_env_paths()
    for p in reversed(paths):
        merged.update(_parse_dotenv(p))
    if not ignore_os_env:
        for key in (
            "JIRA_BASE_URL",
            "JIRA_EMAIL",
            "JIRA_API_TOKEN",
            "JIRA_PROJECT_NAME",
            "JIRA_PROJECT_KEY",
            "JIRA_ISSUE_TYPE",
            "JIRA_AUTO_ASSIGN_SELF",
        ):
            if key in os.environ and os.environ[key].strip():
                merged[key] = os.environ[key].strip()

    base_url = merged.get("JIRA_BASE_URL", "https://optibide-org.atlassian.net").strip().rstrip("/")
    email = merged.get("JIRA_EMAIL", "").strip()
    api_token = merged.get("JIRA_API_TOKEN", "").strip()
    project_name = merged.get("JIRA_PROJECT_NAME", "Internship Program 2026").strip()
    project_key = merged.get("JIRA_PROJECT_KEY", "").strip()
    issue_type = merged.get("JIRA_ISSUE_TYPE", "Bug").strip() or "Bug"
    auto_assign_raw = merged.get("JIRA_AUTO_ASSIGN_SELF", "true").strip().lower()
    auto_assign_self = auto_assign_raw not in {"0", "false", "no", "off"}

    if not _is_http_url(base_url):
        raise ConfigError(f"JIRA_BASE_URL không hợp lệ: {base_url!r}")
    if not email or "@" not in email:
        raise ConfigError(
            "Thiếu JIRA_EMAIL hợp lệ trong .env.jira. Hãy điền email đăng nhập Jira của bạn."
        )
    if api_token in PLACEHOLDER_TOKENS:
        raise ConfigError(
            "Chưa cấu hình JIRA_API_TOKEN hợp lệ trong .env.jira. "
            "Hãy tạo Personal API Token tại https://id.atlassian.com/manage-profile/security/api-tokens "
            "rồi dán vào dòng JIRA_API_TOKEN trong file .env.jira."
        )

    return JiraConfig(
        base_url=base_url,
        email=email,
        api_token=api_token,
        project_name=project_name,
        project_key=project_key,
        issue_type=issue_type,
        auto_assign_self=auto_assign_self,
    )


def validate_report(payload: dict[str, Any], base_dir: pathlib.Path | None = None) -> BugReport:
    if not isinstance(payload, dict):
        raise ValidationError("Dữ liệu Bug Report phải là một JSON object.")

    def req_str(field_name: str) -> str:
        val = payload.get(field_name)
        if not isinstance(val, str) or not val.strip():
            raise ValidationError(f"Thiếu trường bắt buộc theo chuẩn goodNstay QA: '{field_name}'.")
        return val.strip()

    title = req_str("title")
    if len(title) > 255:
        raise ValidationError("Trường 'title' (Jira Summary) không được vượt quá 255 ký tự.")
    environment = req_str("environment")
    actual_result = req_str("actual_result")
    expected_result = req_str("expected_result")

    raw_steps = payload.get("steps_to_reproduce")
    steps: list[str] = []
    if isinstance(raw_steps, list):
        steps = [str(s).strip() for s in raw_steps if str(s).strip()]
    elif isinstance(raw_steps, str) and raw_steps.strip():
        for line in raw_steps.splitlines():
            cleaned = re.sub(r"^\s*\d+[\.\)]\s*", "", line).strip()
            if cleaned:
                steps.append(cleaned)
    if not steps:
        raise ValidationError("Thiếu trường bắt buộc 'steps_to_reproduce' (cần ít nhất 1 bước tái hiện).")

    raw_evidence = payload.get("evidence")
    evidence: dict[str, str] = {}
    if isinstance(raw_evidence, dict):
        for k in ("url", "datetime", "console", "network", "notes", "reference_url"):
            v = raw_evidence.get(k)
            if v is not None and str(v).strip():
                evidence[k] = str(v).strip()

    missing_ev = [k for k in ("url", "datetime") if not evidence.get(k)]
    has_f12 = bool(evidence.get("console") or evidence.get("network"))
    if missing_ev or not has_f12:
        raise ValidationError(
            "Trường 'evidence' bắt buộc phải là object chứa đủ 3 yếu tố chuẩn goodNstay QA: "
            "'url' (Full URL), 'datetime' (Current Datetime), và ít nhất 'console' hoặc 'network' (F12 DevTools)."
        )

    classification = str(payload.get("classification") or "").strip() or DEFAULT_CLASSIFICATION

    resolve_root = base_dir or pathlib.Path.cwd()
    raw_attachments = payload.get("attachments") or []
    if not isinstance(raw_attachments, list):
        raise ValidationError("Trường 'attachments' phải là danh sách đường dẫn file.")

    attachments: list[pathlib.Path] = []
    for item in raw_attachments:
        p = pathlib.Path(str(item)).expanduser()
        if not p.is_absolute():
            p = (resolve_root / p).resolve()
        if not p.is_file():
            raise ValidationError(f"Không tìm thấy file đính kèm: {p}")
        if p.stat().st_size == 0:
            raise ValidationError(f"File đính kèm bị rỗng (0 bytes): {p}")
        attachments.append(p)

    raw_labels = payload.get("labels") or []
    if not isinstance(raw_labels, list):
        raise ValidationError("Trường 'labels' phải là danh sách chuỗi (array of strings).")
    labels = [re.sub(r"\s+", "-", str(lbl).strip()) for lbl in raw_labels if str(lbl).strip()]

    jira_fields = payload.get("jira_fields") or {}
    if not isinstance(jira_fields, dict):
        raise ValidationError("Trường 'jira_fields' (nếu có) phải là một JSON object.")

    return BugReport(
        title=title,
        environment=environment,
        steps_to_reproduce=steps,
        actual_result=actual_result,
        expected_result=expected_result,
        evidence=evidence,
        classification=classification,
        severity=str(payload.get("severity") or "").strip(),
        priority_label=str(payload.get("priority_label") or "").strip(),
        reproducibility=str(payload.get("reproducibility") or "").strip(),
        test_account=str(payload.get("test_account") or "").strip(),
        labels=labels,
        jira_fields=dict(jira_fields),
        attachments=attachments,
    )


def _adf_text(text: str, bold: bool = False, link: str | None = None) -> dict[str, Any]:
    node: dict[str, Any] = {"type": "text", "text": text}
    marks: list[dict[str, Any]] = []
    if bold:
        marks.append({"type": "strong"})
    if link and _is_http_url(link):
        marks.append({"type": "link", "attrs": {"href": link}})
    if marks:
        node["marks"] = marks
    return node


def _adf_heading(text: str, level: int = 3) -> dict[str, Any]:
    return {"type": "heading", "attrs": {"level": level}, "content": [_adf_text(text)]}


def _adf_paragraph(*inline_nodes: dict[str, Any]) -> dict[str, Any]:
    return {"type": "paragraph", "content": list(inline_nodes)}


def _adf_bullet_list(items: list[list[dict[str, Any]]]) -> dict[str, Any]:
    return {
        "type": "bulletList",
        "content": [
            {"type": "listItem", "content": [_adf_paragraph(*nodes)]}
            for nodes in items
            if nodes
        ],
    }


def _adf_doc(blocks: list[dict[str, Any]]) -> dict[str, Any]:
    return {"version": 1, "type": "doc", "content": blocks or [_adf_paragraph(_adf_text("-"))]}


def _adf_paragraphs_from_text(raw: str) -> list[dict[str, Any]]:
    blocks = [_adf_paragraph(_adf_text(line.strip())) for line in raw.splitlines() if line.strip()]
    return blocks or [_adf_paragraph(_adf_text(raw.strip() or "-"))]


def _adf_media_blocks(media_items: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    if not media_items:
        return blocks
    for item in media_items:
        filename = str(item.get("filename") or "")
        if filename:
            blocks.append(_adf_paragraph(_adf_text(f"Screenshot: {filename}", bold=True)))
        media_attrs: dict[str, Any] = {
            "type": "file",
            "id": item["id"],
            "collection": item.get("collection", ""),
            "width": int(item.get("width") or 1280),
            "height": int(item.get("height") or 720),
        }
        if filename:
            media_attrs["alt"] = filename
        blocks.append(
            {
                "type": "mediaSingle",
                "attrs": {"layout": "center"},
                "content": [{"type": "media", "attrs": media_attrs}],
            }
        )
    return blocks


def _match_allowed_option(allowed_values: list[dict[str, Any]], candidates: list[str]) -> dict[str, str] | None:
    for cand in candidates:
        c_low = cand.lower()
        for opt in allowed_values:
            label = str(opt.get("value") or opt.get("name") or "").strip().lower()
            if label == c_low and opt.get("id"):
                return {"id": str(opt["id"])}
    for cand in candidates:
        c_low = cand.lower()
        for opt in allowed_values:
            label = str(opt.get("value") or opt.get("name") or "").strip().lower()
            if c_low in label and opt.get("id"):
                return {"id": str(opt["id"])}
    return None


def build_structured_custom_fields(
    report: BugReport,
    meta_fields: list[dict[str, Any]] | None,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Populate project-specific structured Bug tabs (Reporting, Expectation, RCA) dynamically from metadata."""
    if not meta_fields:
        return {}

    populated: dict[str, Any] = {}
    env_lower = report.environment.lower()
    sev_upper = report.severity.upper()
    prio_upper = report.priority_label.upper()

    for mf in meta_fields:
        fid = str(mf.get("fieldId") or mf.get("key") or "").strip()
        if not fid or fid in report.jira_fields:
            continue
        name_low = str(mf.get("name") or "").strip().lower()
        allowed = mf.get("allowedValues") if isinstance(mf.get("allowedValues"), list) else []

        if fid == "priority" and allowed:
            prio_candidates: list[str] = []
            if "P0" in prio_upper or "S0" in sev_upper:
                prio_candidates = ["Highest", "High"]
            elif "P1" in prio_upper or "S1" in sev_upper:
                prio_candidates = ["High", "Medium"]
            elif "P2" in prio_upper or "S2" in sev_upper:
                prio_candidates = ["Medium"]
            elif "P3" in prio_upper or "S3" in sev_upper:
                prio_candidates = ["Low", "Medium"]
            elif "S4" in sev_upper:
                prio_candidates = ["Lowest", "Low"]
            matched = _match_allowed_option(allowed, prio_candidates)
            if matched:
                populated[fid] = matched

        elif name_low == "environment" and allowed:
            env_candidates: list[str] = []
            if "prod" in env_lower:
                env_candidates.append("Production")
            if "stag" in env_lower:
                env_candidates.append("Staging")
            if "test" in env_lower or "dev" in env_lower or "qa" in env_lower:
                env_candidates.append("Testing")
            matched = _match_allowed_option(allowed, env_candidates)
            if matched:
                populated[fid] = matched

        elif name_low == "impact" and allowed:
            imp_candidates: list[str] = []
            if "S0" in sev_upper:
                imp_candidates = ["Extensive / Widespread", "Extensive"]
            elif "S1" in sev_upper:
                imp_candidates = ["Significant / Large", "Significant"]
            elif "S2" in sev_upper:
                imp_candidates = ["Moderate / Limited", "Moderate"]
            elif "S3" in sev_upper or "S4" in sev_upper:
                imp_candidates = ["Minor / Localized", "Minor"]
            matched = _match_allowed_option(allowed, imp_candidates)
            if matched:
                populated[fid] = matched

        elif name_low == "platform" and allowed:
            plat_candidates = ["Web Traveler"]
            if "ios" in env_lower and "safari" not in env_lower and "app" in env_lower:
                plat_candidates = ["iOS Traveler"]
            elif "android" in env_lower and "app" in env_lower:
                plat_candidates = ["Android Traveler"]
            matched = _match_allowed_option(allowed, plat_candidates)
            if matched:
                populated[fid] = [matched]

        elif name_low == "original source location" and allowed:
            if "goodnstay.com" in report.evidence.get("url", "").lower():
                matched = _match_allowed_option(allowed, ["ota-customer-web"])
                if matched:
                    populated[fid] = [matched]

        elif name_low == "pre-condition":
            pre_items: list[list[dict[str, Any]]] = [
                [_adf_text("Environment: ", bold=True), _adf_text(report.environment)],
                [_adf_text("Classification: ", bold=True), _adf_text(report.classification)],
            ]
            if report.test_account:
                pre_items.append([_adf_text("Test Account: ", bold=True), _adf_text(report.test_account)])
            if report.reproducibility:
                pre_items.append([_adf_text("Reproducibility: ", bold=True), _adf_text(report.reproducibility)])
            if report.severity or report.priority_label:
                sev_prio = " | ".join(x for x in (report.severity, report.priority_label) if x)
                pre_items.append([_adf_text("Severity / Priority: ", bold=True), _adf_text(sev_prio)])
            populated[fid] = _adf_doc([_adf_bullet_list(pre_items)])

        elif name_low == "step-by-step":
            populated[fid] = _adf_doc(
                [
                    {
                        "type": "orderedList",
                        "attrs": {"order": 1},
                        "content": [
                            {"type": "listItem", "content": [_adf_paragraph(_adf_text(step))]}
                            for step in report.steps_to_reproduce
                        ],
                    }
                ]
            )

        elif name_low == "actual result":
            populated[fid] = _adf_doc(_adf_paragraphs_from_text(report.actual_result))

        elif name_low == "expected result":
            populated[fid] = _adf_doc(_adf_paragraphs_from_text(report.expected_result))

        elif name_low == "signals and clues":
            clue_items: list[list[dict[str, Any]]] = []
            if report.evidence.get("console"):
                clue_items.append([_adf_text("F12 Console: ", bold=True), _adf_text(report.evidence["console"])])
            if report.evidence.get("network"):
                clue_items.append([_adf_text("F12 Network: ", bold=True), _adf_text(report.evidence["network"])])
            if report.evidence.get("notes"):
                clue_items.append([_adf_text("DOM/CSS/JS Root Cause: ", bold=True), _adf_text(report.evidence["notes"])])
            if clue_items:
                populated[fid] = _adf_doc([_adf_bullet_list(clue_items)])

        elif name_low.startswith("detailed analysis"):
            ev_items: list[list[dict[str, Any]]] = []
            if report.evidence.get("url"):
                u = report.evidence["url"]
                ev_items.append([_adf_text("Full URL: ", bold=True), _adf_text(u, link=u)])
            if report.evidence.get("datetime"):
                ev_items.append([_adf_text("Datetime: ", bold=True), _adf_text(report.evidence["datetime"])])
            if report.evidence.get("console"):
                ev_items.append([_adf_text("F12 Console: ", bold=True), _adf_text(report.evidence["console"])])
            if report.evidence.get("network"):
                ev_items.append([_adf_text("F12 Network: ", bold=True), _adf_text(report.evidence["network"])])
            if report.evidence.get("notes"):
                ev_items.append([_adf_text("Technical Diagnostic: ", bold=True), _adf_text(report.evidence["notes"])])
            ev_items.append([_adf_text("Classification: ", bold=True), _adf_text(report.classification)])
            blocks: list[dict[str, Any]] = [_adf_bullet_list(ev_items)]
            blocks.extend(_adf_media_blocks(media_items))
            populated[fid] = _adf_doc(blocks)

        elif name_low == "ui references":
            ref_items: list[list[dict[str, Any]]] = []
            if report.evidence.get("url"):
                u = report.evidence["url"]
                ref_items.append([_adf_text("Page URL: ", bold=True), _adf_text(u, link=u)])
            if report.evidence.get("reference_url"):
                r = report.evidence["reference_url"]
                ref_items.append([_adf_text("Reference Authority: ", bold=True), _adf_text(r, link=r)])
            if report.attachments:
                ref_items.append(
                    [
                        _adf_text("Evidence Files: ", bold=True),
                        _adf_text(", ".join(p.name for p in report.attachments)),
                    ]
                )
            blocks = [_adf_bullet_list(ref_items)] if ref_items else []
            blocks.extend(_adf_media_blocks(media_items))
            if blocks:
                populated[fid] = _adf_doc(blocks)

    return populated


def build_adf_description(
    report: BugReport,
    media_items: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    content: list[dict[str, Any]] = []

    # 1. Environment & Classification Metadata
    content.append(_adf_heading("1. Environment & Triage Metadata"))
    meta_bullets: list[list[dict[str, Any]]] = [
        [_adf_text("Environment: ", bold=True), _adf_text(report.environment)],
        [_adf_text("Classification: ", bold=True), _adf_text(report.classification)],
    ]
    if report.severity or report.priority_label:
        sev_prio = " | ".join(x for x in (report.severity, report.priority_label) if x)
        meta_bullets.append([_adf_text("Severity / Priority: ", bold=True), _adf_text(sev_prio)])
    if report.reproducibility:
        meta_bullets.append([_adf_text("Reproducibility: ", bold=True), _adf_text(report.reproducibility)])
    if report.test_account:
        meta_bullets.append([_adf_text("Test Account: ", bold=True), _adf_text(report.test_account)])
    if report.evidence.get("reference_url"):
        ref_val = report.evidence["reference_url"]
        meta_bullets.append(
            [_adf_text("Reference Spec: ", bold=True), _adf_text(ref_val, link=ref_val)]
        )
    content.append(_adf_bullet_list(meta_bullets))

    # 2. Steps to Reproduce
    content.append(_adf_heading("2. Steps to Reproduce"))
    content.append(
        {
            "type": "orderedList",
            "attrs": {"order": 1},
            "content": [
                {"type": "listItem", "content": [_adf_paragraph(_adf_text(step))]}
                for step in report.steps_to_reproduce
            ],
        }
    )

    # 3. Actual Result
    content.append(_adf_heading("3. Actual Result"))
    for para in report.actual_result.splitlines():
        if para.strip():
            content.append(_adf_paragraph(_adf_text(para.strip())))

    # 4. Expected Result
    content.append(_adf_heading("4. Expected Result"))
    for para in report.expected_result.splitlines():
        if para.strip():
            content.append(_adf_paragraph(_adf_text(para.strip())))

    # 5. Evidence & Chrome DevTools (F12)
    content.append(_adf_heading("5. Mandatory Evidence & F12 DevTools"))
    ev_bullets: list[list[dict[str, Any]]] = []
    if report.evidence.get("url"):
        url_val = report.evidence["url"]
        ev_bullets.append([_adf_text("Full URL: ", bold=True), _adf_text(url_val, link=url_val)])
    if report.evidence.get("datetime"):
        ev_bullets.append([_adf_text("Current Datetime: ", bold=True), _adf_text(report.evidence["datetime"])])
    if report.evidence.get("console"):
        ev_bullets.append([_adf_text("F12 Console: ", bold=True), _adf_text(report.evidence["console"])])
    if report.evidence.get("network"):
        ev_bullets.append([_adf_text("F12 Network: ", bold=True), _adf_text(report.evidence["network"])])
    if report.evidence.get("notes"):
        ev_bullets.append([_adf_text("Notes: ", bold=True), _adf_text(report.evidence["notes"])])
    if report.attachments:
        names = ", ".join(p.name for p in report.attachments)
        ev_bullets.append([_adf_text("Attached Files: ", bold=True), _adf_text(names)])
    if ev_bullets:
        content.append(_adf_bullet_list(ev_bullets))

    if media_items:
        content.extend(_adf_media_blocks(media_items))

    return {"version": 1, "type": "doc", "content": content}


def format_preview(config: JiraConfig | None, report: BugReport) -> str:
    target_site = config.base_url if config else "https://optibide-org.atlassian.net"
    target_proj = (
        (config.project_key or config.project_name)
        if config
        else "Internship Program 2026"
    )
    lines = [
        "=== XEM TRƯỚC JIRA BUG REPORT (DRY-RUN — CHƯA ĐĂNG LÊN JIRA) ===",
        f"Jira Site      : {target_site}",
        f"Target Project : {target_proj}",
        f"Title          : {report.title}",
        f"Environment    : {report.environment}",
        f"Classification : {report.classification}",
    ]
    if report.severity or report.priority_label:
        lines.append(f"Severity/Prio  : {' | '.join(x for x in (report.severity, report.priority_label) if x)}")
    if report.reproducibility:
        lines.append(f"Reproducibility: {report.reproducibility}")
    if report.test_account:
        lines.append(f"Test Account   : {report.test_account}")
    if report.labels:
        lines.append(f"Labels         : {', '.join(report.labels)}")
    lines.append("\nSteps to Reproduce:")
    for idx, step in enumerate(report.steps_to_reproduce, 1):
        lines.append(f"  {idx}. {step}")
    lines.append(f"\nActual Result:\n  {report.actual_result}")
    lines.append(f"\nExpected Result:\n  {report.expected_result}")
    lines.append("\nEvidence & F12:")
    for k, v in report.evidence.items():
        lines.append(f"  - {k}: {v}")
    lines.append(f"\nAttachments ({len(report.attachments)} file):")
    if report.attachments:
        for p in report.attachments:
            kb = p.stat().st_size / 1024.0
            w, h = _read_image_dimensions(p)
            lines.append(f"  - {p.name} ({kb:.1f} KB, {w}x{h}px) [OK]")
    else:
        lines.append("  - [CẢNH BÁO] Chưa có ảnh chụp màn hình / video bằng chứng đính kèm!")
    lines.append("================================================================")
    return "\n".join(lines)


class JiraClient:
    def __init__(self, config: JiraConfig, timeout: int = 30):
        self.config = config
        self.timeout = timeout
        token_bytes = f"{config.email}:{config.api_token}".encode("utf-8")
        self._auth_header = "Basic " + base64.b64encode(token_bytes).decode("ascii")

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> Any:
        url = f"{self.config.base_url}{path}"
        headers = {
            "Authorization": self._auth_header,
            "Accept": "application/json",
        }
        body: bytes | None = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if extra_headers:
            headers.update(extra_headers)

        last_exc: Exception | None = None
        for attempt in range(3):
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read()
                    if not raw:
                        return None
                    return json.loads(raw.decode("utf-8"))
            except urllib.error.HTTPError as exc:
                try:
                    detail = exc.read().decode("utf-8", errors="replace")
                finally:
                    exc.close()
                raise JiraApiError(f"Jira API {method} {path} thất bại (HTTP {exc.code}): {detail}") from exc
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_exc = exc
                if attempt < 2:
                    time.sleep(0.4 * (attempt + 1))
                    continue
        reason = getattr(last_exc, "reason", str(last_exc))
        raise JiraApiError(f"Không thể kết nối tới {url}: {reason}") from last_exc

    def verify_myself(self) -> dict[str, Any]:
        return self._request_json("GET", "/rest/api/3/myself")

    def resolve_project_key(self, target: str | None = None) -> str:
        if self.config.project_key and not target:
            return self.config.project_key
        search_term = (target or self.config.project_key or self.config.project_name).strip()
        projects: list[dict[str, Any]] = []
        start_at = 0
        while True:
            query = urlencode(
                {
                    "query": search_term,
                    "action": "create",
                    "status": "live",
                    "startAt": start_at,
                    "maxResults": 50,
                }
            )
            data = self._request_json("GET", f"/rest/api/3/project/search?{query}")
            page = data.get("values", []) if isinstance(data, dict) else []
            projects.extend(page)
            if not isinstance(data, dict) or data.get("isLast", True) or not page:
                break
            start_at += len(page)

        lowered = search_term.lower()
        for proj in projects:
            if str(proj.get("key", "")).strip().lower() == lowered:
                return str(proj["key"]).strip()
        for proj in projects:
            if str(proj.get("name", "")).strip().lower() == lowered:
                return str(proj["key"]).strip()

        # Fallback: check Jira Agile Boards matching the exact name (e.g. "Internship Program 2026" -> projectKey "OP")
        try:
            b_start = 0
            while True:
                b_query = urlencode({"name": search_term, "startAt": b_start, "maxResults": 50})
                b_data = self._request_json("GET", f"/rest/agile/1.0/board?{b_query}")
                boards = b_data.get("values", []) if isinstance(b_data, dict) else []
                for brd in boards:
                    if str(brd.get("name", "")).strip().lower() == lowered:
                        loc = brd.get("location") or {}
                        b_proj_key = str(loc.get("projectKey") or "").strip()
                        if b_proj_key:
                            return b_proj_key
                if not isinstance(b_data, dict) or b_data.get("isLast", True) or not boards:
                    break
                b_start += len(boards)
        except JiraApiError:
            pass

        available = ", ".join(f"{p.get('name')} ({p.get('key')})" for p in projects) or "không tìm thấy project nào"
        raise JiraApiError(
            f"Không khớp chính xác tên hoặc mã project/board {search_term!r}. Các project tìm thấy: {available}"
        )

    def resolve_issue_type(
        self,
        project_key: str,
        desired_name: str | None = None,
    ) -> tuple[str, str | None]:
        want = (desired_name or self.config.issue_type or "Bug").strip()
        want_lower = want.lower()
        data = self._request_json(
            "GET",
            f"/rest/api/3/issue/createmeta/{quote(project_key, safe='')}/issuetypes?maxResults=200",
        )
        raw_types = (
            data.get("issueTypes") or data.get("values") or []
            if isinstance(data, dict)
            else []
        )
        standard_types = [it for it in raw_types if not it.get("subtask")]

        for it in standard_types:
            if str(it.get("name", "")).strip().lower() == want_lower:
                return str(it["id"]), None

        for fallback in ("bug", "lỗi", "task"):
            for it in standard_types:
                if str(it.get("name", "")).strip().lower() == fallback:
                    matched_name = str(it.get("name"))
                    warn = (
                        None
                        if fallback == want_lower
                        else f"Project {project_key} không có loại '{want}', đã chuyển sang '{matched_name}'."
                    )
                    return str(it["id"]), warn

        available = ", ".join(str(it.get("name")) for it in standard_types) or "rỗng"
        raise JiraApiError(
            f"Project {project_key} không có Issue Type {want!r}. Các loại hiện có: {available}"
        )

    def resolve_issue_type_id(self, project_key: str, desired_name: str | None = None) -> str:
        issue_type_id, _ = self.resolve_issue_type(project_key, desired_name=desired_name)
        return issue_type_id

    def fetch_createmeta_fields(
        self,
        project_key: str,
        issue_type_id: str,
    ) -> list[dict[str, Any]] | None:
        path = (
            f"/rest/api/3/issue/createmeta/{quote(project_key, safe='')}"
            f"/issuetypes/{quote(issue_type_id, safe='')}?maxResults=200"
        )
        try:
            data = self._request_json("GET", path)
        except JiraApiError:
            return None
        if isinstance(data, dict):
            fields = data.get("fields") or data.get("values")
            if isinstance(fields, list):
                return fields
        return None

    def verify_connection(self) -> dict[str, Any]:
        me = self.verify_myself()
        proj_key = self.resolve_project_key()
        issue_type_id, type_warning = self.resolve_issue_type(proj_key)
        meta_fields = self.fetch_createmeta_fields(proj_key, issue_type_id) or []
        required_custom = [
            f"{f.get('name')} ({f.get('fieldId') or f.get('key')})"
            for f in meta_fields
            if f.get("required")
            and (f.get("fieldId") or f.get("key")) not in {"project", "issuetype", "summary", "reporter"}
        ]
        result: dict[str, Any] = {
            "ok": True,
            "site": self.config.base_url,
            "account": me.get("displayName"),
            "email": me.get("emailAddress"),
            "project_key": proj_key,
            "issue_type_id": issue_type_id,
            "required_extra_fields": required_custom,
        }
        if type_warning:
            result["warning"] = type_warning
        return result

    def create_issue(
        self,
        project_key: str,
        issue_type_id: str,
        report: BugReport,
        allowed_field_ids: set[str] | None = None,
        self_account_id: str | None = None,
        meta_fields: list[dict[str, Any]] | None = None,
    ) -> tuple[dict[str, Any], list[str]]:
        warnings: list[str] = []
        fields: dict[str, Any] = {
            "project": {"key": project_key},
            "issuetype": {"id": issue_type_id},
            "summary": report.title,
            "description": build_adf_description(report),
        }
        fields.update(build_structured_custom_fields(report, meta_fields))
        if (
            self_account_id
            and "assignee" not in report.jira_fields
            and (allowed_field_ids is None or "assignee" in allowed_field_ids)
        ):
            fields["assignee"] = {"id": self_account_id}
        if report.labels:
            if allowed_field_ids is not None and "labels" not in allowed_field_ids:
                warnings.append(
                    "Trường 'labels' không có trên màn hình tạo issue của project nên đã được bỏ qua tự động."
                )
            else:
                fields["labels"] = report.labels
        if report.jira_fields:
            fields.update(report.jira_fields)
        created = self._request_json("POST", "/rest/api/3/issue", payload={"fields": fields})
        return created, warnings

    def upload_attachment(self, issue_key: str, file_path: pathlib.Path) -> dict[str, Any]:
        boundary = f"----goodNstayJiraBoundary{uuid.uuid4().hex}"
        mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        clean_name = file_path.name.replace("\r", "").replace("\n", "")
        ascii_fallback = (
            clean_name.encode("ascii", "replace").decode("ascii").replace("\\", "_").replace('"', "_")
        )
        disposition = f'Content-Disposition: form-data; name="file"; filename="{ascii_fallback}"'
        try:
            clean_name.encode("ascii")
        except UnicodeEncodeError:
            disposition += f"; filename*=UTF-8''{quote(clean_name, safe='')}"

        file_bytes = file_path.read_bytes()
        body_parts = [
            f"--{boundary}\r\n".encode("ascii"),
            f"{disposition}\r\n".encode("ascii"),
            f"Content-Type: {mime_type}\r\n\r\n".encode("ascii"),
            file_bytes,
            f"\r\n--{boundary}--\r\n".encode("ascii"),
        ]
        body = b"".join(body_parts)

        url = f"{self.config.base_url}/rest/api/3/issue/{quote(issue_key, safe='')}/attachments"
        headers = {
            "Authorization": self._auth_header,
            "Accept": "application/json",
            "X-Atlassian-Token": "no-check",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        }
        last_exc: Exception | None = None
        for attempt in range(3):
            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=max(self.timeout, 90)) as resp:
                    created_list = json.loads(resp.read().decode("utf-8"))
                    if isinstance(created_list, list) and created_list:
                        info = dict(created_list[0])
                        info["local_filename"] = file_path.name
                        return info
                    return {"local_filename": file_path.name}
            except urllib.error.HTTPError as exc:
                try:
                    detail = exc.read().decode("utf-8", errors="replace")
                finally:
                    exc.close()
                raise JiraApiError(
                    f"Upload ảnh {file_path.name!r} lên {issue_key} thất bại (HTTP {exc.code}): {detail}"
                ) from exc
            except (urllib.error.URLError, TimeoutError, OSError) as exc:
                last_exc = exc
                if attempt < 2:
                    time.sleep(0.6 * (attempt + 1))
                    continue
        reason = getattr(last_exc, "reason", str(last_exc))
        raise JiraApiError(
            f"Upload ảnh {file_path.name!r} lên {issue_key} bị gián đoạn mạng/timeout: {reason}"
        ) from last_exc

    def fetch_media_info(
        self,
        attachment_id: str,
        file_path: pathlib.Path,
    ) -> dict[str, Any] | None:
        url = f"{self.config.base_url}/rest/api/3/attachment/content/{quote(str(attachment_id), safe='')}"
        opener = urllib.request.build_opener(_NoRedirectHandler)
        location = ""
        for attempt in range(3):
            req = urllib.request.Request(
                url,
                headers={"Authorization": self._auth_header},
                method="GET",
            )
            try:
                with opener.open(req, timeout=self.timeout) as resp:
                    location = resp.headers.get("Location", "")
                    break
            except urllib.error.HTTPError as exc:
                try:
                    if exc.code in (301, 302, 303, 307, 308):
                        location = exc.headers.get("Location", "")
                        break
                    return None
                finally:
                    exc.close()
            except (urllib.error.URLError, TimeoutError, OSError):
                if attempt < 2:
                    time.sleep(0.4 * (attempt + 1))
                    continue
                return None

        if not location:
            return None
        match = MEDIA_UUID_RE.search(location)
        if not match:
            return None
        parsed_loc = urlparse(location)
        collection = parse_qs(parsed_loc.query).get("collection", [""])[0]
        width, height = _read_image_dimensions(file_path)
        return {
            "id": match.group(1),
            "collection": collection,
            "filename": file_path.name,
            "width": width,
            "height": height,
        }

    def update_description_with_media(
        self,
        issue_key: str,
        report: BugReport,
        media_items: list[dict[str, Any]],
        meta_fields: list[dict[str, Any]] | None = None,
    ) -> None:
        adf = build_adf_description(report, media_items=media_items)
        update_fields: dict[str, Any] = {"description": adf}
        structured = build_structured_custom_fields(report, meta_fields, media_items=media_items)
        for fid, val in structured.items():
            if isinstance(val, dict) and val.get("type") == "doc" and "mediaSingle" in json.dumps(val):
                update_fields[fid] = val
        self._request_json(
            "PUT",
            f"/rest/api/3/issue/{quote(issue_key, safe='')}",
            payload={"fields": update_fields},
        )

    def sync_existing_issue_fields(self, issue_key: str, report: BugReport) -> dict[str, Any]:
        issue_data = self._request_json(
            "GET",
            f"/rest/api/3/issue/{quote(issue_key, safe='')}?fields=attachment",
        )
        editmeta = self._request_json(
            "GET",
            f"/rest/api/3/issue/{quote(issue_key, safe='')}/editmeta",
        )
        raw_edit_fields = (editmeta or {}).get("fields", {})
        meta_fields = [
            dict(v, fieldId=k)
            for k, v in raw_edit_fields.items()
            if isinstance(v, dict)
        ]

        existing_by_name: dict[str, str] = {}
        for att in ((issue_data or {}).get("fields") or {}).get("attachment") or []:
            if att.get("filename") and att.get("id"):
                existing_by_name[str(att["filename"])] = str(att["id"])

        media_items: list[dict[str, Any]] = []
        for file_path in report.attachments:
            att_id = existing_by_name.get(file_path.name)
            if not att_id:
                uploaded = self.upload_attachment(issue_key, file_path)
                att_id = str(uploaded.get("id") or "")
            if att_id and file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm"}:
                info = self.fetch_media_info(att_id, file_path)
                if info:
                    media_items.append(info)

        fields_to_put: dict[str, Any] = {
            "summary": report.title,
            "description": build_adf_description(report, media_items=media_items or None),
        }
        fields_to_put.update(
            build_structured_custom_fields(report, meta_fields, media_items=media_items or None)
        )
        if report.jira_fields:
            fields_to_put.update(report.jira_fields)

        self._request_json(
            "PUT",
            f"/rest/api/3/issue/{quote(issue_key, safe='')}",
            payload={"fields": fields_to_put},
        )
        return {
            "mode": "updated",
            "issue_key": issue_key,
            "issue_url": f"{self.config.base_url}/browse/{issue_key}",
            "populated_field_ids": sorted(fields_to_put.keys()),
            "inline_embedded_count": len(media_items),
        }


def submit_bug_report(
    config: JiraConfig,
    report: BugReport,
    confirm: bool = False,
) -> dict[str, Any]:
    preview = format_preview(config, report)
    if not confirm:
        return {
            "mode": "dry-run",
            "preview": preview,
            "attachments_verified": [str(p) for p in report.attachments],
        }

    client = JiraClient(config)
    self_account_id: str | None = None
    if config.auto_assign_self and "assignee" not in report.jira_fields:
        me = client.verify_myself()
        if isinstance(me, dict) and me.get("accountId"):
            self_account_id = str(me["accountId"])

    project_key = client.resolve_project_key()
    issue_type_id, type_warning = client.resolve_issue_type(project_key)
    meta_fields = client.fetch_createmeta_fields(project_key, issue_type_id)
    allowed_ids = (
        {str(f.get("fieldId") or f.get("key")) for f in meta_fields if f.get("fieldId") or f.get("key")}
        if meta_fields is not None
        else None
    )

    created, warnings = client.create_issue(
        project_key,
        issue_type_id,
        report,
        allowed_field_ids=allowed_ids,
        self_account_id=self_account_id,
        meta_fields=meta_fields,
    )
    if type_warning:
        warnings.insert(0, type_warning)
    issue_key = str(created["key"])

    uploaded_attachments: list[dict[str, Any]] = []
    media_items: list[dict[str, Any]] = []

    for file_path in report.attachments:
        try:
            att = client.upload_attachment(issue_key, file_path)
        except JiraApiError as exc:
            warnings.append(str(exc))
            continue
        uploaded_attachments.append(att)
        att_id = att.get("id")
        if att_id and file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".webm"}:
            media_info = client.fetch_media_info(str(att_id), file_path)
            if media_info:
                media_items.append(media_info)

    embedded_count = 0
    if media_items:
        try:
            client.update_description_with_media(issue_key, report, media_items, meta_fields=meta_fields)
            embedded_count = len(media_items)
        except JiraApiError as exc:
            warnings.append(
                f"Đã upload file đính kèm thành công nhưng không thể nhúng inline vào mô tả ADF: {exc}"
            )

    return {
        "mode": "created",
        "issue_key": issue_key,
        "issue_url": f"{config.base_url}/browse/{issue_key}",
        "project_key": project_key,
        "uploaded_attachments": uploaded_attachments,
        "inline_embedded_count": embedded_count,
        "warnings": warnings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="goodNstay QA — Công cụ tự động tạo Jira Bug Report kèm ảnh đính kèm."
    )
    parser.add_argument(
        "--env-file",
        type=pathlib.Path,
        help="Đường dẫn tới file .env.jira (mặc định tự tìm .env.jira hoặc .env trong workspace).",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Kiểm tra xác thực API Token và tự dò mã Project 'Internship Program 2026'.",
    )
    parser.add_argument(
        "--input",
        type=pathlib.Path,
        help="Đường dẫn tới file JSON chứa nội dung Bug Report chuẩn 7 mục.",
    )
    parser.add_argument(
        "--update",
        type=str,
        help="Mã ticket cần đồng bộ/điền lại toàn bộ các trường chi tiết (VD: OP-1662).",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Xác nhận đăng thật lên Jira (mặc định nếu không có cờ này sẽ chạy chế độ xem trước dry-run an toàn).",
    )
    args = parser.parse_args(argv)

    env_paths = [args.env_file] if args.env_file else None

    if args.verify:
        try:
            config = load_config(env_paths)
            info = JiraClient(config).verify_connection()
            print(json.dumps(info, indent=2, ensure_ascii=False))
            return 0
        except JiraReporterError as exc:
            print(f"[LỖI KẾT NỐI JIRA] {exc}", file=sys.stderr)
            return 2

    if not args.input:
        parser.print_help()
        return 1

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8-sig"))
        report = validate_report(payload, base_dir=args.input.resolve().parent)
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        print(f"[LỖI DỮ LIỆU BUG REPORT] {exc}", file=sys.stderr)
        return 1

    config: JiraConfig | None = None
    config_err: ConfigError | None = None
    try:
        config = load_config(env_paths)
    except ConfigError as exc:
        config_err = exc

    if not args.confirm:
        print(format_preview(config, report))
        if config_err:
            print(f"\n[LƯU Ý CẤU HÌNH] {config_err}")
        else:
            print("\n[SẴN SÀNG] Truyền thêm cờ --confirm sau khi người dùng duyệt để tạo ticket thật trên Jira.")
        return 0

    if config_err or config is None:
        print(f"[CHẶN ĐĂNG TICKET] {config_err}", file=sys.stderr)
        return 2

    try:
        if args.update:
            result = JiraClient(config).sync_existing_issue_fields(args.update.strip(), report)
        else:
            result = submit_bug_report(config, report, confirm=True)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except JiraReporterError as exc:
        print(f"[LỖI TẠO TICKET JIRA] {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())

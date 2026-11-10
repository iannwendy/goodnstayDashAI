#!/usr/bin/env python3
"""Zero-dependency CLI helper for the drawio-diagram-builder skill.

Capabilities:
1. validate   - Validate .drawio XML structure (uncompressed or compressed) + visual/layout lints.
2. url        - Encode a .drawio file into a 1-click https://app.diagrams.net/#R... URL (optionally open).
3. lessons    - Recall distilled rules & user preferences before generating a diagram.
4. log-feedback - Record user corrections or validator catches and promote rules to lessons_learned.md.
5. diff-learn - Compare two .drawio files (before vs. after manual user edit on diagrams.net)
                to automatically extract layout/style preferences.
"""

from __future__ import annotations

import argparse
import base64
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

SKILL_DIR = Path(__file__).resolve().parent.parent
MEMORY_DIR = SKILL_DIR / "memory"
LESSONS_FILE = MEMORY_DIR / "lessons_learned.md"
FEEDBACK_LOG_FILE = MEMORY_DIR / "feedback_log.jsonl"

SECTION_MAP = {
    "style_preference": "## 1. User Style & Visual Preferences",
    "user_correction": "## 2. Layout & Routing Rules",
    "validator_catch": "## 3. XML & Container Pitfalls",
    "domain_convention": "## 4. Project & Domain Conventions",
}


@dataclass
class CellInfo:
    cell_id: str
    value: str
    style: dict[str, str]
    raw_style: str
    parent: str | None
    is_vertex: bool
    is_edge: bool
    source: str | None
    target: str | None
    x: float
    y: float
    width: float
    height: float
    relative: bool


def parse_style(style_str: str | None) -> dict[str, str]:
    if not style_str:
        return {}
    result: dict[str, str] = {}
    for token in style_str.split(";"):
        token = token.strip()
        if not token:
            continue
        if "=" in token:
            k, v = token.split("=", 1)
            result[k.strip()] = v.strip()
        else:
            result[token] = "1"
    return result


def strip_html(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = (
        cleaned.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
    )
    return cleaned.strip()


def compress_drawio_payload(xml_str: str) -> str:
    """Compress XML string using diagrams.net's URI-encode + raw-deflate + base64 scheme."""
    encoded = urllib.parse.quote(xml_str, safe="-_.!~*'()")
    compressor = zlib.compressobj(9, zlib.DEFLATED, -15)
    deflated = compressor.compress(encoded.encode("utf-8")) + compressor.flush()
    return base64.b64encode(deflated).decode("ascii")


def decompress_drawio_payload(payload: str) -> str:
    """Decompress a base64 + raw-deflate + URI-encoded <diagram> text payload."""
    raw = base64.b64decode(payload.strip())
    inflated = zlib.decompress(raw, -15).decode("utf-8")
    return urllib.parse.unquote(inflated)


def extract_diagram_models(drawio_path: Path) -> tuple[ET.Element, list[tuple[str, ET.Element]]]:
    """Parse a .drawio file and return (mxfile_root, [(page_name, mxGraphModel_element), ...])."""
    raw_text = drawio_path.read_text(encoding="utf-8")
    root = ET.fromstring(raw_text)

    if root.tag == "mxGraphModel":
        return root, [("Page-1", root)]

    if root.tag != "mxfile":
        raise ValueError(f"Root tag must be <mxfile> or <mxGraphModel>, got <{root.tag}>")

    diagrams = root.findall("diagram")
    if not diagrams:
        raise ValueError("<mxfile> contains no <diagram> elements.")

    pages: list[tuple[str, ET.Element]] = []
    for idx, diag in enumerate(diagrams, start=1):
        page_name = diag.attrib.get("name", f"Page-{idx}")
        model = diag.find("mxGraphModel")
        if model is not None:
            pages.append((page_name, model))
            continue

        inner_text = (diag.text or "").strip()
        if not inner_text:
            raise ValueError(f"Diagram '{page_name}' has neither <mxGraphModel> child nor compressed payload.")
        try:
            decompressed_xml = decompress_drawio_payload(inner_text)
            decompressed_el = ET.fromstring(decompressed_xml)
        except Exception as exc:
            raise ValueError(f"Failed to decode compressed diagram '{page_name}': {exc}") from exc

        if decompressed_el.tag != "mxGraphModel":
            raise ValueError(
                f"Decoded diagram '{page_name}' root must be <mxGraphModel>, got <{decompressed_el.tag}>"
            )
        pages.append((page_name, decompressed_el))

    return root, pages


def extract_cells(model: ET.Element) -> tuple[list[CellInfo], list[str]]:
    """Extract CellInfo records from an <mxGraphModel> and report structural errors."""
    errors: list[str] = []
    root_el = model.find("root")
    if root_el is None:
        return [], ["Missing <root> element inside <mxGraphModel>."]

    cells: list[CellInfo] = []
    for node in root_el:
        if node.tag in ("UserObject", "object"):
            cell_el = node.find("mxCell")
            if cell_el is None:
                errors.append(f"<{node.tag} id='{node.attrib.get('id', '?')}'> missing child <mxCell>.")
                continue
            cell_id = node.attrib.get("id") or cell_el.attrib.get("id") or ""
            value = node.attrib.get("label") or cell_el.attrib.get("value") or ""
        elif node.tag == "mxCell":
            cell_el = node
            cell_id = cell_el.attrib.get("id", "")
            value = cell_el.attrib.get("value", "")
        else:
            continue

        raw_style = cell_el.attrib.get("style", "")
        style = parse_style(raw_style)
        parent = cell_el.attrib.get("parent")
        is_vertex = cell_el.attrib.get("vertex") == "1"
        is_edge = cell_el.attrib.get("edge") == "1"
        source = cell_el.attrib.get("source")
        target = cell_el.attrib.get("target")

        geom = cell_el.find("mxGeometry")
        x = y = width = height = 0.0
        relative = False
        if geom is not None:
            try:
                x = float(geom.attrib.get("x", "0"))
                y = float(geom.attrib.get("y", "0"))
                width = float(geom.attrib.get("width", "0"))
                height = float(geom.attrib.get("height", "0"))
            except ValueError:
                errors.append(f"Cell '{cell_id}' has non-numeric mxGeometry attributes.")
            relative = geom.attrib.get("relative") == "1"
        elif is_vertex or is_edge:
            errors.append(f"Cell '{cell_id}' (vertex/edge) is missing <mxGeometry>.")

        cells.append(
            CellInfo(
                cell_id=cell_id,
                value=value,
                style=style,
                raw_style=raw_style,
                parent=parent,
                is_vertex=is_vertex,
                is_edge=is_edge,
                source=source,
                target=target,
                x=x,
                y=y,
                width=width,
                height=height,
                relative=relative,
            )
        )

    return cells, errors


def is_container_like(cell: CellInfo, children_by_parent: dict[str, list[CellInfo]]) -> bool:
    if cell.cell_id in children_by_parent:
        return True
    s = cell.style
    return any(
        k in s
        for k in ("swimlane", "group", "container", "collapsible")
    )


def is_table_row(cell: CellInfo, by_id: dict[str, CellInfo]) -> bool:
    parent = by_id.get(cell.parent or "")
    if not parent:
        return False
    return parent.style.get("shape") == "table" or "childLayout" in parent.style


def compute_abs_pos(cell: CellInfo, by_id: dict[str, CellInfo], seen: set[str] | None = None) -> tuple[float, float]:
    if seen is None:
        seen = set()
    if cell.cell_id in seen:
        return cell.x, cell.y
    seen.add(cell.cell_id)
    if not cell.parent or cell.parent in ("0", "1") or cell.parent not in by_id:
        return cell.x, cell.y
    px, py = compute_abs_pos(by_id[cell.parent], by_id, seen)
    return px + cell.x, py + cell.y


def lowest_common_ancestor(a_id: str, b_id: str, by_id: dict[str, CellInfo]) -> str:
    ancestors_a: list[str] = []
    cur: str | None = a_id
    visited: set[str] = set()
    while cur and cur not in visited:
        visited.add(cur)
        ancestors_a.append(cur)
        cell = by_id.get(cur)
        cur = cell.parent if cell else None

    ancestors_set = set(ancestors_a)
    cur = b_id
    visited.clear()
    while cur and cur not in visited:
        visited.add(cur)
        if cur in ancestors_set:
            return cur
        cell = by_id.get(cur)
        cur = cell.parent if cell else None
    return "1"


def validate_drawio(drawio_path: Path) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    stats: dict[str, int] = {"pages": 0, "vertices": 0, "edges": 0}

    if not drawio_path.exists():
        return {"valid": False, "errors": [f"File not found: {drawio_path}"], "warnings": [], "stats": stats}

    try:
        _, pages = extract_diagram_models(drawio_path)
    except (ET.ParseError, ValueError) as exc:
        return {"valid": False, "errors": [f"XML/Format Error: {exc}"], "warnings": [], "stats": stats}

    stats["pages"] = len(pages)

    for page_name, model in pages:
        prefix = f"[{page_name}] "
        cells, cell_errors = extract_cells(model)
        errors.extend(prefix + e for e in cell_errors)
        if not cells:
            errors.append(f"{prefix}Diagram contains no mxCell elements.")
            continue

        id_counts = Counter(c.cell_id for c in cells)
        for cid, count in id_counts.items():
            if not cid:
                errors.append(f"{prefix}Found mxCell with empty 'id' attribute.")
            elif count > 1:
                errors.append(f"{prefix}Duplicate mxCell id='{cid}' ({count} occurrences).")

        by_id = {c.cell_id: c for c in cells if c.cell_id}
        if "0" not in by_id:
            errors.append(f"{prefix}Missing root cell <mxCell id='0'/>.")
        if "1" not in by_id:
            errors.append(f"{prefix}Missing default layer cell <mxCell id='1' parent='0'/>.")
        elif by_id["1"].parent != "0":
            errors.append(f"{prefix}Cell id='1' must have parent='0', got parent='{by_id['1'].parent}'.")

        children_by_parent: dict[str, list[CellInfo]] = {}
        for c in cells:
            if c.cell_id in ("0", "1"):
                continue
            if not c.parent:
                errors.append(f"{prefix}Cell id='{c.cell_id}' is missing 'parent' attribute.")
            elif c.parent not in by_id:
                errors.append(f"{prefix}Cell id='{c.cell_id}' references non-existent parent='{c.parent}'.")
            else:
                children_by_parent.setdefault(c.parent, []).append(c)

        vertices = [c for c in cells if c.is_vertex and not c.relative]
        edges = [c for c in cells if c.is_edge]
        stats["vertices"] += len(vertices)
        stats["edges"] += len(edges)

        # Edge validation
        for edge in edges:
            if edge.source and edge.source not in by_id:
                errors.append(f"{prefix}Edge id='{edge.cell_id}' references missing source='{edge.source}'.")
            if edge.target and edge.target not in by_id:
                errors.append(f"{prefix}Edge id='{edge.cell_id}' references missing target='{edge.target}'.")
            if not edge.source or not edge.target:
                warnings.append(
                    f"{prefix}Edge id='{edge.cell_id}' uses floating endpoint(s) (source={edge.source}, target={edge.target}); prefer explicit node IDs."
                )
            if edge.source in by_id and edge.target in by_id:
                src_cell = by_id[edge.source]
                tgt_cell = by_id[edge.target]
                if src_cell.parent != tgt_cell.parent:
                    lca = lowest_common_ancestor(src_cell.cell_id, tgt_cell.cell_id, by_id)
                    if edge.parent not in ("1", lca):
                        warnings.append(
                            f"{prefix}Cross-container edge id='{edge.cell_id}' ({edge.source} -> {edge.target}) has parent='{edge.parent}'; set parent='1' (or common ancestor '{lca}') to prevent misrouted coordinates."
                        )

        # Vertex size, child bounds, and text overflow checks
        for v in vertices:
            if v.width <= 0 or v.height <= 0:
                warnings.append(
                    f"{prefix}Vertex id='{v.cell_id}' has zero/negative dimensions ({v.width}x{v.height})."
                )
                continue

            # Child bounds inside container
            if v.parent and v.parent not in ("0", "1") and v.parent in by_id:
                parent_cell = by_id[v.parent]
                if parent_cell.is_vertex and parent_cell.width > 0 and parent_cell.height > 0:
                    if v.x < 0 or v.y < 0:
                        warnings.append(
                            f"{prefix}Child vertex id='{v.cell_id}' has negative relative coordinates ({v.x}, {v.y}) inside container '{parent_cell.cell_id}'."
                        )
                    if v.x + v.width > parent_cell.width + 2 or v.y + v.height > parent_cell.height + 2:
                        warnings.append(
                            f"{prefix}Child vertex id='{v.cell_id}' ({v.x + v.width}x{v.y + v.height}) overflows container '{parent_cell.cell_id}' ({parent_cell.width}x{parent_cell.height})."
                        )

            # Text fit heuristic (skip containers whose label is only in the header bar)
            plain_label = strip_html(v.value)
            if plain_label and not is_container_like(v, children_by_parent):
                font_size = float(v.style.get("fontSize", "12"))
                # Approximate character cell area (conservative so normal labels pass, cramped boxes warn)
                est_char_area = len(plain_label) * (font_size * 0.62) * (font_size * 1.45)
                usable_area = max(1.0, (v.width - 12) * (v.height - 8))
                if est_char_area > usable_area * 1.15 and len(plain_label) > 12:
                    warnings.append(
                        f"{prefix}Text overflow risk on vertex id='{v.cell_id}' ('{plain_label[:35]}...'): size {int(v.width)}x{int(v.height)} may truncate {len(plain_label)} chars."
                    )
                if len(plain_label) > 22 and "\n" not in plain_label and v.style.get("whiteSpace") != "wrap":
                    warnings.append(
                        f"{prefix}Vertex id='{v.cell_id}' has long label ({len(plain_label)} chars) without 'whiteSpace=wrap;' in style."
                    )

        # Sibling overlap detection (same parent, non-table-row leaf/sibling vertices)
        for parent_id, siblings in children_by_parent.items():
            box_siblings = [
                s
                for s in siblings
                if s.is_vertex
                and not s.relative
                and s.width > 0
                and s.height > 0
                and not is_table_row(s, by_id)
                and s.style.get("shape") not in ("line",)
            ]
            for i in range(len(box_siblings)):
                a = box_siblings[i]
                for j in range(i + 1, len(box_siblings)):
                    b = box_siblings[j]
                    # Skip background/frame shapes if one completely encloses another intentionally as a visual zone
                    overlap_x = min(a.x + a.width, b.x + b.width) - max(a.x, b.x)
                    overlap_y = min(a.y + a.height, b.y + b.height) - max(a.y, b.y)
                    if overlap_x > 4 and overlap_y > 4:
                        warnings.append(
                            f"{prefix}Overlapping sibling vertices under parent='{parent_id}': '{a.cell_id}' ({int(a.x)},{int(a.y)} {int(a.width)}x{int(a.height)}) overlaps '{b.cell_id}' ({int(b.x)},{int(b.y)} {int(b.width)}x{int(b.height)}) by {int(overlap_x)}x{int(overlap_y)}px."
                        )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "stats": stats,
    }


def generate_diagrams_net_url(drawio_path: Path) -> str:
    raw_xml = drawio_path.read_text(encoding="utf-8").strip()
    compressed = compress_drawio_payload(raw_xml)
    title = urllib.parse.quote(drawio_path.name)
    hash_payload = urllib.parse.quote(compressed, safe="")
    return f"https://app.diagrams.net/?title={title}#R{hash_payload}"


def ensure_memory_initialized() -> None:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    if not LESSONS_FILE.exists():
        LESSONS_FILE.write_text(
            "# Draw.io Diagram Builder — Lessons Learned & Preferences\n\n"
            "## 1. User Style & Visual Preferences\n\n"
            "## 2. Layout & Routing Rules\n\n"
            "## 3. XML & Container Pitfalls\n\n"
            "## 4. Project & Domain Conventions\n",
            encoding="utf-8",
        )
    if not FEEDBACK_LOG_FILE.exists():
        FEEDBACK_LOG_FILE.write_text("", encoding="utf-8")


def promote_rule_to_lessons(feedback_type: str, rule: str, diagram_name: str | None = None) -> bool:
    ensure_memory_initialized()
    content = LESSONS_FILE.read_text(encoding="utf-8")
    normalized_rule = rule.strip()
    if normalized_rule.lower() in content.lower():
        return False

    section_header = SECTION_MAP.get(feedback_type, "## 2. Layout & Routing Rules")
    date_tag = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    source_note = f" *(from `{diagram_name}`, {date_tag})*" if diagram_name else f" *({date_tag})*"
    bullet_line = f"- {normalized_rule}{source_note}\n"

    if section_header in content:
        idx = content.index(section_header) + len(section_header)
        next_sec = content.find("\n## ", idx)
        if next_sec == -1:
            content = content.rstrip() + "\n" + bullet_line
        else:
            before = content[:next_sec].rstrip()
            after = content[next_sec:]
            content = before + "\n" + bullet_line + "\n" + after.lstrip("\n")
    else:
        content = content.rstrip() + f"\n\n{section_header}\n{bullet_line}"

    LESSONS_FILE.write_text(content, encoding="utf-8")
    return True


def log_feedback_entry(
    diagram: str,
    feedback_type: str,
    issue: str,
    rule: str,
    promote: bool = False,
) -> dict[str, object]:
    ensure_memory_initialized()
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "diagram": diagram,
        "feedback_type": feedback_type,
        "issue": issue.strip(),
        "actionable_rule": rule.strip(),
        "promoted": False,
    }
    if promote:
        entry["promoted"] = promote_rule_to_lessons(
            feedback_type=feedback_type,
            rule=rule,
            diagram_name=Path(diagram).name if diagram else None,
        )
    with FEEDBACK_LOG_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return entry


def diff_learn_drawio(before_path: Path, after_path: Path) -> dict[str, object]:
    """Compare before vs. after .drawio files to infer user manual edits on app.diagrams.net."""
    _, before_pages = extract_diagram_models(before_path)
    _, after_pages = extract_diagram_models(after_path)

    before_cells: dict[str, CellInfo] = {}
    for _, m in before_pages:
        cs, _ = extract_cells(m)
        for c in cs:
            before_cells[c.cell_id] = c

    after_cells: dict[str, CellInfo] = {}
    for _, m in after_pages:
        cs, _ = extract_cells(m)
        for c in cs:
            after_cells[c.cell_id] = c

    common_ids = [cid for cid in after_cells if cid in before_cells and cid not in ("0", "1")]
    resized: list[str] = []
    moved: list[str] = []
    fill_changes: Counter[tuple[str, str]] = Counter()
    font_sizes: Counter[str] = Counter()
    edge_styles: Counter[str] = Counter()
    width_deltas: list[float] = []
    height_deltas: list[float] = []

    for cid in common_ids:
        b = before_cells[cid]
        a = after_cells[cid]
        if a.is_vertex:
            dw = a.width - b.width
            dh = a.height - b.height
            if abs(dw) >= 10 or abs(dh) >= 10:
                resized.append(f"{cid}: {int(b.width)}x{int(b.height)} -> {int(a.width)}x{int(a.height)}")
                width_deltas.append(dw)
                height_deltas.append(dh)
            if abs(a.x - b.x) >= 15 or abs(a.y - b.y) >= 15:
                moved.append(f"{cid}: ({int(b.x)},{int(b.y)}) -> ({int(a.x)},{int(a.y)})")
            bf, af = b.style.get("fillColor", ""), a.style.get("fillColor", "")
            if bf != af and af:
                fill_changes[(bf or "default", af)] += 1
            bfs, afs = b.style.get("fontSize", ""), a.style.get("fontSize", "")
            if bfs != afs and afs:
                font_sizes[afs] += 1
        elif a.is_edge:
            bes, aes = b.style.get("edgeStyle", ""), a.style.get("edgeStyle", "")
            if bes != aes and aes:
                edge_styles[aes] += 1

    inferred_lessons: list[str] = []
    if len(width_deltas) >= 2 and sum(width_deltas) / len(width_deltas) >= 15:
        avg_dw = int(sum(width_deltas) / len(width_deltas))
        inferred_lessons.append(
            f"Increase default vertex width by ~{avg_dw}px compared to previous baseline to match user's manual sizing."
        )
    if len(height_deltas) >= 2 and sum(height_deltas) / len(height_deltas) >= 10:
        avg_dh = int(sum(height_deltas) / len(height_deltas))
        inferred_lessons.append(
            f"Increase default vertex height by ~{avg_dh}px compared to previous baseline for cleaner padding."
        )
    for (old_c, new_c), cnt in fill_changes.most_common(3):
        if cnt >= 2:
            inferred_lessons.append(
                f"User replaced fillColor '{old_c}' with '{new_c}' across {cnt} shapes; prefer '{new_c}' for this role."
            )
    for fs, cnt in font_sizes.most_common(1):
        if cnt >= 2:
            inferred_lessons.append(f"User standardized fontSize={fs} across {cnt} shapes.")
    for es, cnt in edge_styles.most_common(1):
        if cnt >= 2:
            inferred_lessons.append(f"User switched {cnt} connectors to edgeStyle={es}.")

    return {
        "added_cells": len(set(after_cells) - set(before_cells)),
        "removed_cells": len(set(before_cells) - set(after_cells)),
        "resized_count": len(resized),
        "moved_count": len(moved),
        "resized_examples": resized[:8],
        "moved_examples": moved[:8],
        "inferred_lessons": inferred_lessons,
    }


def cmd_validate(args: argparse.Namespace) -> int:
    result = validate_drawio(Path(args.file))
    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        status = "PASS" if result["valid"] and (not args.strict or not result["warnings"]) else "FAIL"
        stats = result["stats"]
        print(
            f"[{status}] {args.file} — pages={stats['pages']}, vertices={stats['vertices']}, edges={stats['edges']}"
        )
        for err in result["errors"]:
            print(f"  ERROR: {err}")
        for warn in result["warnings"]:
            print(f"  WARN:  {warn}")
        if not result["errors"] and not result["warnings"]:
            print("  Clean geometry & valid mxGraphModel structure.")
    if not result["valid"]:
        return 1
    if args.strict and result["warnings"]:
        return 1
    return 0


def cmd_url(args: argparse.Namespace) -> int:
    path = Path(args.file)
    check = validate_drawio(path)
    if not check["valid"]:
        for err in check["errors"]:
            print(f"ERROR: {err}", file=sys.stderr)
        return 1
    url = generate_diagrams_net_url(path)
    print(url)
    if args.open:
        subprocess.run(["open", url], check=False)
    return 0


def cmd_lessons(args: argparse.Namespace) -> int:
    ensure_memory_initialized()
    print(LESSONS_FILE.read_text(encoding="utf-8").strip())
    lines = [ln for ln in FEEDBACK_LOG_FILE.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if lines and args.recent > 0:
        print(f"\n--- Recent Feedback Log (last {min(args.recent, len(lines))} of {len(lines)}) ---")
        for raw in lines[-args.recent :]:
            item = json.loads(raw)
            print(
                f"[{item.get('timestamp', '')[:10]}] ({item.get('feedback_type')}) "
                f"Issue: {item.get('issue')} -> Rule: {item.get('actionable_rule')}"
            )
    return 0


def cmd_log_feedback(args: argparse.Namespace) -> int:
    entry = log_feedback_entry(
        diagram=args.diagram or "",
        feedback_type=args.type,
        issue=args.issue,
        rule=args.rule,
        promote=args.promote,
    )
    print(json.dumps(entry, indent=2, ensure_ascii=False))
    return 0


def cmd_diff_learn(args: argparse.Namespace) -> int:
    summary = diff_learn_drawio(Path(args.before), Path(args.after))
    if args.record and summary["inferred_lessons"]:
        recorded = []
        for rule in summary["inferred_lessons"]:
            recorded.append(
                log_feedback_entry(
                    diagram=args.after,
                    feedback_type="style_preference",
                    issue="Detected consistent manual user adjustments on diagrams.net",
                    rule=rule,
                    promote=True,
                )
            )
        summary["recorded_entries"] = recorded
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Draw.io (.drawio) Validator, URL Encoder & Self-Learning Helper")
    sub = parser.add_subparsers(dest="command", required=True)

    p_val = sub.add_parser("validate", help="Validate .drawio XML structure and layout rules")
    p_val.add_argument("file", help="Path to .drawio file")
    p_val.add_argument("--strict", action="store_true", help="Exit non-zero on layout warnings too")
    p_val.add_argument("--json", action="store_true", help="Output JSON result")
    p_val.set_defaults(func=cmd_validate)

    p_url = sub.add_parser("url", help="Generate 1-click https://app.diagrams.net/#R... URL")
    p_url.add_argument("file", help="Path to .drawio file")
    p_url.add_argument("--open", action="store_true", help="Open URL in macOS default browser")
    p_url.set_defaults(func=cmd_url)

    p_les = sub.add_parser("lessons", help="Display distilled lessons & recent feedback before drawing")
    p_les.add_argument("--recent", type=int, default=5, help="Number of recent feedback log entries to show")
    p_les.set_defaults(func=cmd_lessons)

    p_fb = sub.add_parser("log-feedback", help="Record user feedback or validator catch")
    p_fb.add_argument("--diagram", default="", help="Path or name of diagram file")
    p_fb.add_argument(
        "--type",
        choices=["style_preference", "user_correction", "validator_catch", "domain_convention"],
        default="user_correction",
        help="Feedback category",
    )
    p_fb.add_argument("--issue", required=True, help="What went wrong or what the user requested to change")
    p_fb.add_argument("--rule", required=True, help="Concrete, generalizable rule for future diagrams")
    p_fb.add_argument("--promote", action="store_true", help="Also promote rule into memory/lessons_learned.md")
    p_fb.set_defaults(func=cmd_log_feedback)

    p_diff = sub.add_parser("diff-learn", help="Extract preferences from manual user edits between two .drawio files")
    p_diff.add_argument("before", help="Original agent-generated .drawio file")
    p_diff.add_argument("after", help="User-edited .drawio file saved from diagrams.net")
    p_diff.add_argument("--record", action="store_true", help="Automatically log & promote inferred rules")
    p_diff.set_defaults(func=cmd_diff_learn)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

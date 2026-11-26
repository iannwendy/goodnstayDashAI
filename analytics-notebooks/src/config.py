"""Runtime configuration for goodNstay Jupyter analytics notebooks.

Loads local `.env` safely, clamps BigQuery cost ceilings to match
`dashboard/bigquery-bff/src/config.ts`, and treats temporary `OPENAI_API_KEY`
placeholders cleanly without exposing secrets in notebook outputs.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Mapping

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional before venv install
    load_dotenv = None

DEFAULT_GCP_PROJECT_ID = "aevo-512307"
DEFAULT_BQ_LOCATION = "US"
DEFAULT_MAX_BYTES_BILLED = 25 * 1024 * 1024  # 25 MiB (~$0.00015 worst-case)
HARD_CAP_BYTES_BILLED = 100 * 1024 * 1024    # 100 MiB hard safety cap
DEFAULT_TEMP_OPENAI_KEY = "sk-temp-placeholder-replace-me"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

DataSourceMode = Literal["auto", "bigquery", "seed"]
AiProviderMode = Literal["auto", "openai", "fallback"]

_PLACEHOLDER_MARKERS = (
    "temp",
    "placeholder",
    "replace-me",
    "replace_me",
    "your-key",
    "your_api_key",
    "changeme",
    "dummy",
    "example",
)


def is_placeholder_openai_key(api_key: str | None) -> bool:
    """Return True when the configured OpenAI key is missing or a temporary placeholder."""
    if not api_key:
        return True
    cleaned = api_key.strip()
    if len(cleaned) < 20:
        return True
    lowered = cleaned.lower()
    if lowered.startswith("sk-temp"):
        return True
    return any(marker in lowered for marker in _PLACEHOLDER_MARKERS)


def _parse_positive_int(raw: str | None, fallback: int) -> int:
    if not raw:
        return fallback
    try:
        value = int(raw.strip())
    except ValueError:
        return fallback
    return value if value > 0 else fallback


def _parse_bool(raw: str | None, fallback: bool = False) -> bool:
    if raw is None:
        return fallback
    lowered = raw.strip().lower()
    if lowered in {"1", "true", "yes", "on"}:
        return True
    if lowered in {"0", "false", "no", "off"}:
        return False
    return fallback


def _resolve_repo_root() -> Path:
    # analytics-notebooks/src/config.py -> repo root is 2 parents above analytics-notebooks
    return Path(__file__).resolve().parents[2]


def _resolve_default_seed_dir() -> Path:
    return _resolve_repo_root() / "dashboard" / "dashboard" / "master-data" / "seed"


@dataclass(frozen=True)
class NotebookSettings:
    gcp_project_id: str = DEFAULT_GCP_PROJECT_ID
    bq_location: str = DEFAULT_BQ_LOCATION
    bq_max_bytes_billed: int = DEFAULT_MAX_BYTES_BILLED
    data_source_mode: DataSourceMode = "auto"
    allow_bq_writeback: bool = False
    openai_api_key: str = DEFAULT_TEMP_OPENAI_KEY
    openai_model: str = DEFAULT_OPENAI_MODEL
    ai_provider_mode: AiProviderMode = "auto"
    seed_master_data_dir: Path = _resolve_default_seed_dir()

    @property
    def has_live_openai_key(self) -> bool:
        return not is_placeholder_openai_key(self.openai_api_key)

    def masked_openai_key(self) -> str:
        """Return a safe display label that never leaks the real API key."""
        if not self.has_live_openai_key:
            return "<TEMP_PLACEHOLDER>"
        return f"sk-...{self.openai_api_key.strip()[-4:]}"

    def summary_dict(self) -> dict[str, object]:
        return {
            "gcp_project_id": self.gcp_project_id,
            "bq_location": self.bq_location,
            "bq_max_bytes_billed_mib": round(self.bq_max_bytes_billed / (1024 * 1024), 2),
            "data_source_mode": self.data_source_mode,
            "allow_bq_writeback": self.allow_bq_writeback,
            "openai_api_key_status": self.masked_openai_key(),
            "openai_model": self.openai_model,
            "ai_provider_mode": self.ai_provider_mode,
        }


def load_settings(
    env_path: Path | None = None,
    environ: Mapping[str, str] | None = None,
) -> NotebookSettings:
    """Load notebook settings from `.env` (if present) and environment variables."""
    if environ is None:
        candidate_env = env_path or (_resolve_repo_root() / "analytics-notebooks" / ".env")
        if load_dotenv is not None and candidate_env.exists():
            load_dotenv(dotenv_path=candidate_env, override=False)
        env = os.environ
    else:
        env = environ

    requested_bytes = _parse_positive_int(
        env.get("BQ_MAX_BYTES_BILLED"),
        DEFAULT_MAX_BYTES_BILLED,
    )
    clamped_bytes = min(requested_bytes, HARD_CAP_BYTES_BILLED)

    raw_source = (env.get("DATA_SOURCE_MODE") or "auto").strip().lower()
    data_source_mode: DataSourceMode = (
        raw_source if raw_source in {"auto", "bigquery", "seed"} else "auto"  # type: ignore[assignment]
    )

    raw_ai_mode = (env.get("AI_PROVIDER_MODE") or "auto").strip().lower()
    ai_provider_mode: AiProviderMode = (
        raw_ai_mode if raw_ai_mode in {"auto", "openai", "fallback"} else "auto"  # type: ignore[assignment]
    )

    seed_dir_raw = env.get("SEED_MASTER_DATA_DIR")
    seed_dir = Path(seed_dir_raw).expanduser().resolve() if seed_dir_raw else _resolve_default_seed_dir()

    return NotebookSettings(
        gcp_project_id=(env.get("GCP_PROJECT_ID") or DEFAULT_GCP_PROJECT_ID).strip(),
        bq_location=(env.get("BQ_LOCATION") or DEFAULT_BQ_LOCATION).strip(),
        bq_max_bytes_billed=clamped_bytes,
        data_source_mode=data_source_mode,
        allow_bq_writeback=_parse_bool(env.get("ALLOW_BQ_WRITEBACK"), False),
        openai_api_key=(env.get("OPENAI_API_KEY") or DEFAULT_TEMP_OPENAI_KEY).strip(),
        openai_model=(env.get("OPENAI_MODEL") or DEFAULT_OPENAI_MODEL).strip(),
        ai_provider_mode=ai_provider_mode,
        seed_master_data_dir=seed_dir,
    )

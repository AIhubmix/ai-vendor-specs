"""ai-vendor-specs: official OpenAPI / Discovery specs for major AI providers.

This is the minimal data-access layer for v0.1.0. It exposes:

- ``load_manifest()``                  — top-level vendor catalog (dict)
- ``list_vendors()``                   — iterator over every vendor entry
- ``get_vendor(protocol, provider)``   — one vendor entry, or None
- ``load_spec_path(protocol, provider)`` — Path to the raw spec / overlay file

Note: overlay-kind entries store an ``overlay.yml`` file declaring deltas
against a base spec. Composing the base + overlay into a single document is
currently only available in the JavaScript companion package
(``@aihubmix/ai-vendor-specs``). A Python composer is on the roadmap; until
then, this module returns the raw overlay path and consumers either compose
client-side or pre-render via the JS resolver during their build.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Iterator, Optional

__version__ = "0.1.0"

__all__ = [
    "load_manifest",
    "list_vendors",
    "get_vendor",
    "load_spec_path",
    "data_root",
    "__version__",
]


def _find_data_root() -> Path:
    """Locate the directory containing ``upstream/`` and ``manifest.json``.

    Resolution order:
      1. ``AVS_ROOT`` environment variable (explicit override)
      2. Bundled ``_data/`` next to this module (installed wheel)
      3. Repo root two levels up (editable install / monorepo dev)
    """
    env = os.environ.get("AVS_ROOT")
    if env:
        p = Path(env)
        if (p / "upstream").is_dir() and (p / "manifest.json").is_file():
            return p
        raise RuntimeError(f"AVS_ROOT={env!r} but no upstream/ or manifest.json found there")

    here = Path(__file__).resolve().parent
    bundled = here / "_data"
    if (bundled / "upstream").is_dir() and (bundled / "manifest.json").is_file():
        return bundled

    # Editable install in monorepo: python/ai_vendor_specs/ → repo root is parents[1]
    dev_root = here.parents[1]
    if (dev_root / "upstream").is_dir() and (dev_root / "manifest.json").is_file():
        return dev_root

    raise RuntimeError(
        "ai-vendor-specs data not found. Install via `pip install ai-vendor-specs` "
        "or set AVS_ROOT to a directory containing upstream/ and manifest.json."
    )


def data_root() -> Path:
    """Return the resolved data-root directory.

    Useful for tools that want to read arbitrary files under ``upstream/``
    directly without going through the load_* helpers.
    """
    return _find_data_root()


def load_manifest() -> dict[str, Any]:
    """Load the top-level ``manifest.json`` (vendor catalog with URLs)."""
    return json.loads((_find_data_root() / "manifest.json").read_text(encoding="utf-8"))


def list_vendors() -> Iterator[dict[str, Any]]:
    """Yield each vendor entry, with ``key`` injected as ``"<protocol>/<provider>"``."""
    for key, entry in load_manifest()["upstream"].items():
        yield {"key": key, **entry}


def get_vendor(protocol: str, provider: str) -> Optional[dict[str, Any]]:
    """Get one vendor entry, or ``None`` if not present."""
    return load_manifest()["upstream"].get(f"{protocol}/{provider}")


def load_spec_path(protocol: str, provider: str) -> Path:
    """Return the absolute ``Path`` to the raw spec or overlay file.

    For ``kind: spec`` entries this is the OpenAPI/Discovery file. For
    ``kind: overlay`` entries this is the ``overlay.yml`` — composing it
    with its base requires the JavaScript resolver (see module docstring).
    """
    entry = get_vendor(protocol, provider)
    if entry is None:
        raise KeyError(f"{protocol}/{provider} not found in manifest")
    rel = entry.get("specPath") or entry.get("overlayPath")
    if not rel:
        raise RuntimeError(f"no specPath or overlayPath recorded for {protocol}/{provider}")
    return _find_data_root() / rel

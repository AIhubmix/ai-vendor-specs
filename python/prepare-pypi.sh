#!/bin/bash
#
# Populate python/ai_vendor_specs/_data with upstream/ + manifest.json from the
# repo root, and copy README + LICENSE for the wheel. Run before `python -m build`.
#
# Idempotent: rm + cp.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

DATA="$HERE/ai_vendor_specs/_data"

echo "→ Cleaning $DATA"
rm -rf "$DATA"
mkdir -p "$DATA"

echo "→ Copying upstream/ ($(find "$ROOT/upstream" -type f | wc -l | tr -d ' ') files)"
cp -R "$ROOT/upstream" "$DATA/upstream"

echo "→ Copying manifest.json"
cp "$ROOT/manifest.json" "$DATA/manifest.json"

echo "→ Copying README.md (translation note: PyPI shows this on the package page)"
cp "$ROOT/README.md" "$HERE/README.md"

echo "→ Copying LICENSE"
cp "$ROOT/LICENSE" "$HERE/LICENSE"

echo "✅ python/ ready for build"
echo "   next: cd python && python -m build"

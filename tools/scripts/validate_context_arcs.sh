#!/usr/bin/env bash
set -euo pipefail

# Run from anywhere in the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

python3 scripts/validate_context_arcs.py

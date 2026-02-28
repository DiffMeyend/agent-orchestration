#!/usr/bin/env bash
set -euo pipefail

# Bootstrap MindOS structure without legacy /context.
# Usage:
#   ./scripts/bootstrap_structure.sh           # ensure base dirs/files exist
#   ./scripts/bootstrap_structure.sh domain/work/ascend core/customArc ...
#
# For each target passed, creates raw.md, model.yaml, operator.md if missing.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

create_file() {
  local path="$1"
  local header="$2"
  if [[ ! -f "$path" ]]; then
    echo "$header" >"$path"
    echo "created $path"
  fi
}

scaffold_arc() {
  local rel="$1"
  local arc_dir="$ROOT/$rel"
  mkdir -p "$arc_dir"
  create_file "$arc_dir/raw.md"       "# Placeholder raw narrative for $rel"
  create_file "$arc_dir/model.yaml"   "# Placeholder model for $rel (ce_header + context_arc)"
  create_file "$arc_dir/operator.md"  "# Placeholder operator for $rel"
}

# Base dirs/files
mkdir -p "$ROOT/registry" "$ROOT/docs" "$ROOT/core" "$ROOT/domain" "$ROOT/tools/schemas" "$ROOT/tools/templates"
create_file "$ROOT/registry/registry.index.yaml" "# MindOS registry index"
create_file "$ROOT/docs/overview.md" "# Overview"
create_file "$ROOT/docs/architecture.md" "# Architecture"
create_file "$ROOT/docs/glossary.md" "# Glossary"
create_file "$ROOT/docs/conventions.md" "# Conventions"

# Optional targets passed on CLI
if [[ "$#" -gt 0 ]]; then
  for target in "$@"; do
    scaffold_arc "$target"
  done
fi

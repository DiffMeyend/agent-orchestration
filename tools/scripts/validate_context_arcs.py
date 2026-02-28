#!/usr/bin/env python3

import sys
from pathlib import Path

import yaml
from jsonschema import Draft7Validator, ValidationError


def load_yaml_any(path: Path):
    """
    Load YAML from a file and return whatever structure is present.
    Used for schema, which might not be a simple mapping.
    """
    try:
        with path.open("r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        if data is None:
            raise ValueError(f"YAML file is empty in {path}")
        return data
    except Exception as e:
        raise RuntimeError(f"Failed to load YAML from {path}: {e}") from e


def load_yaml_mapping(path: Path):
    """
    Load YAML that is expected to be a mapping (dict at root).
    Used for context models (model.yaml).
    """
    data = load_yaml_any(path)
    if not isinstance(data, dict):
        raise ValueError(f"YAML root is not a mapping in {path}")
    return data


def load_schema(repo_root: Path):
    schema_path = repo_root / "tools" / "schemas" / "context_arc.schema.yaml"
    if not schema_path.is_file():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")
    schema = load_yaml_any(schema_path)
    return Draft7Validator(schema)


def load_registry_paths(repo_root: Path):
    """
    Read registry/registry.index.yaml and return a sorted list of model file paths.
    """
    registry_path = repo_root / "registry" / "registry.index.yaml"
    if not registry_path.is_file():
        raise FileNotFoundError(f"Registry file not found at {registry_path}")
    registry = load_yaml_mapping(registry_path)
    arcs = registry.get("context_registry", {}).get("arcs", [])
    paths = []
    for arc in arcs:
        file_path = arc.get("file")
        if not file_path:
            continue
        paths.append(repo_root / file_path)
    return sorted(paths)


def validate_arc(validator: Draft7Validator, arc_path: Path, repo_root: Path):
    rel_path = arc_path.relative_to(repo_root)
    try:
        data = load_yaml_mapping(arc_path)
        validator.validate(data)
        print(f"[OK]  {rel_path}")
        return True
    except (ValidationError, RuntimeError, ValueError) as e:
        print(f"[BAD] {rel_path} – {e}")
        return False


def main():
    # scripts/validate_context_arcs.py -> repo root is parent of scripts/
    script_path = Path(__file__).resolve()
    repo_root = script_path.parent.parent

    try:
        validator = load_schema(repo_root)
    except Exception as e:
        print(f"[BAD] schema – Failed to load or parse schema: {e}")
        sys.exit(1)

    try:
        arc_files = load_registry_paths(repo_root)
    except Exception as e:
        print(f"[BAD] registry – Failed to load registry.index.yaml: {e}")
        sys.exit(1)

    arc_files = [p for p in arc_files if p.is_file()]
    if not arc_files:
        print("[WARN] No context model files found from registry paths.")
        sys.exit(0)

    total = len(arc_files)
    ok_count = 0
    bad_count = 0

    for arc_path in arc_files:
        if validate_arc(validator, arc_path, repo_root):
            ok_count += 1
        else:
            bad_count += 1

    print(f"[SUMMARY] OK: {ok_count}  BAD: {bad_count}  TOTAL: {total}")

    if bad_count:
        sys.exit(1)


if __name__ == "__main__":
    main()

"""Tests for zip package loading and tree hash."""

import json
import io
import zipfile

import pytest

from tee_runner.services.package_loader import compute_tree_hash, extract_zip_to_map, parse_skill_package


def _make_zip(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for path, content in files.items():
            zf.writestr(path, content)
    return buf.getvalue()


def test_tree_hash_excludes_adapters():
    files = {
        "skill/SKILL.md": b"# Skill",
        "adapters/foo.md": b"ignore",
    }
    h = compute_tree_hash(files)
    assert h.startswith("sha256:")
    files2 = {"skill/SKILL.md": b"# Skill"}
    assert compute_tree_hash(files2) == h


def test_parse_skill_package_minimal():
    zip_bytes = _make_zip(
        {
            "skill/SKILL.md": "# Test Skill\nDo the thing.",
            "skill/manifest.json": json.dumps(
                {
                    "manifest_version": "skillvault-1",
                    "evaluation_type": "redaction",
                    "harness": {"runtime": "builtin"},
                }
            ),
            "skill/metadata.json": json.dumps(
                {
                    "name": "Test",
                    "version": "1.0",
                    "category": "Redaction",
                    "evaluation_type": "redaction",
                    "description": "test",
                }
            ),
        }
    )
    pkg = parse_skill_package(zip_bytes)
    assert pkg.harness_runtime == "builtin"
    assert "Test Skill" in pkg.skill_md
    assert pkg.tree_hash.startswith("sha256:")


def test_legacy_plaintext_skill():
    pkg = parse_skill_package(b"# Legacy skill content")
    assert pkg.harness_runtime == "builtin"
    assert "Legacy" in pkg.skill_md


def test_extract_rejects_traversal():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../evil.txt", "bad")
    with pytest.raises(ValueError):
        extract_zip_to_map(buf.getvalue())


def test_parse_skill_package_strips_zip_root_prefix():
    zip_bytes = _make_zip(
        {
            "ari-portable-skill/skill/SKILL.md": "# Ari Skill",
            "ari-portable-skill/skill/manifest.json": json.dumps(
                {
                    "id": "meta-skill.professor.ari-juels",
                    "kind": "meta-skill",
                    "display_name": "Ari Juels",
                }
            ),
            "ari-portable-skill/skill/knowledge/notes/foo.md": "research note",
            "ari-portable-skill/adapters/codex/x.md": "ignored for hash",
        }
    )
    pkg = parse_skill_package(zip_bytes)
    files = extract_zip_to_map(zip_bytes)
    assert "skill/SKILL.md" in files
    assert pkg.manifest.get("evaluation_type") == "agent"
    assert pkg.metadata.get("evaluation_type") == "agent"

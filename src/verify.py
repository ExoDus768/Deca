"""Offline integrity and reproducibility gate for CI."""
import hashlib
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
import reconcile  # noqa: E402


def main() -> int:
    ok = True
    manifest_path = ROOT / "data" / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for rel, expected in sorted(manifest.items()):
        path = ROOT / rel
        if not path.is_file():
            print(f"HASH MISMATCH: missing {rel}")
            ok = False
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            print(f"HASH MISMATCH: {rel}")
            ok = False

    published_path = ROOT / "published" / "reconciliation.json"
    expected = reconcile.run()
    if not published_path.exists():
        print("MISSING: published/reconciliation.json")
        ok = False
    else:
        try:
            actual = json.loads(published_path.read_text(encoding="utf-8"))
            if actual != expected:
                print("STALE: published/reconciliation.json differs from recomputed output")
                ok = False
        except json.JSONDecodeError:
            print("INVALID JSON: published/reconciliation.json")
            ok = False

    # Explicitly distinguish an integrity pass from a completed live-data audit.
    ready = any(v.get("status") == "reconciled" for v in expected["metrics"].values())
    if ok:
        print("VERIFY OK — integrity and deterministic publication checks passed")
        if not ready:
            print("DATA STATUS — awaiting verified providers and normalized metric series")
    else:
        print("VERIFY FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

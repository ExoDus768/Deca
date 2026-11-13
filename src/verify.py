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

    # Validate normalized daily metric invariants and explicit coverage metadata.
    for metric_name in ("intents_daily_volume_usd.json", "daily_transactions.json"):
        metric_path = ROOT / "data" / "metrics" / metric_name
        if not metric_path.exists():
            print(f"MISSING: data/metrics/{metric_name}")
            ok = False
            continue
        try:
            document = json.loads(metric_path.read_text(encoding="utf-8"))
            metadata = document.get("metadata", {})
            series = document.get("series", {}).get("intents_explorer", {})
            if not series:
                print(f"EMPTY: data/metrics/{metric_name}")
                ok = False
            if metadata.get("unique_rows", 0) < metadata.get("successful_rows", 0):
                print(f"INVALID COUNTS: data/metrics/{metric_name} unique_rows < successful_rows")
                ok = False
            if metadata.get("duplicates_removed", 0) < 0:
                print(f"INVALID DEDUPLICATION COUNT: data/metrics/{metric_name}")
                ok = False
            if any(float(value) < 0 for value in series.values()):
                print(f"NEGATIVE METRIC VALUE: data/metrics/{metric_name}")
                ok = False
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            print(f"INVALID METRIC: data/metrics/{metric_name}: {exc}")
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

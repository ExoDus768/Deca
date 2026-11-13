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

    # Enhanced quality outputs become mandatory once the upgraded normalizer has published them.
    base_metric = ROOT / "data" / "metrics" / "intents_daily_volume_usd.json"
    base_doc = json.loads(base_metric.read_text(encoding="utf-8")) if base_metric.exists() else {}
    base_metadata = base_doc.get("metadata", {})
    require_enhanced = str(base_metadata.get("adapter_version", "0")) >= "1.2.0"

    # Validate normalized daily metric invariants and explicit coverage metadata.
    for metric_name in ("intents_daily_volume_usd.json", "daily_transactions.json", "daily_quality.json"):
        metric_path = ROOT / "data" / "metrics" / metric_name
        if not metric_path.exists():
            if metric_name == "daily_quality.json" and not require_enhanced:
                continue
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
            if "unique_rows" in metadata and metadata.get("unique_rows", 0) < metadata.get("successful_rows", 0):
                print(f"INVALID COUNTS: data/metrics/{metric_name} unique_rows < successful_rows")
                ok = False
            if "duplicates_removed" in metadata and metadata.get("duplicates_removed", 0) < 0:
                print(f"INVALID DEDUPLICATION COUNT: data/metrics/{metric_name}")
                ok = False
            if metric_name != "daily_quality.json" and any(float(value) < 0 for value in series.values()):
                print(f"NEGATIVE METRIC VALUE: data/metrics/{metric_name}")
                ok = False
            if metric_name == "intents_daily_volume_usd.json" and require_enhanced:
                for field in ("raw_rows", "unique_rows", "duplicates_removed", "successful_rows",
                              "success_rate_pct", "latest_snapshot_pages", "generated_at_utc"):
                    if metadata.get(field) is None:
                        print(f"MISSING INTEGRITY FIELD: {field}")
                        ok = False
                if metadata.get("raw_rows", 0) - metadata.get("unique_rows", 0) != metadata.get("duplicates_removed", 0):
                    print("INVALID DEDUPLICATION RECONCILIATION")
                    ok = False
            if metric_name == "daily_quality.json":
                for day, item in series.items():
                    rate = item.get("success_rate_pct")
                    if rate is not None and not 0 <= float(rate) <= 100:
                        print(f"INVALID DAILY SUCCESS RATE: {day}")
                        ok = False
                    if item.get("successful_transactions", 0) > item.get("unique_records", 0):
                        print(f"INVALID DAILY QUALITY COUNTS: {day}")
                        ok = False
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            print(f"INVALID METRIC: data/metrics/{metric_name}: {exc}")
            ok = False

    pair_path = ROOT / "data" / "metrics" / "asset_pair_breakdown.json"
    volume_path = ROOT / "data" / "metrics" / "intents_daily_volume_usd.json"
    if not pair_path.exists():
        if require_enhanced:
            print("MISSING: data/metrics/asset_pair_breakdown.json")
            ok = False
    else:
        try:
            pair_doc = json.loads(pair_path.read_text(encoding="utf-8"))
            pairs = pair_doc.get("pairs", [])
            if not isinstance(pairs, list):
                print("INVALID ASSET-PAIR BREAKDOWN")
                ok = False
            elif pairs and any(float(item.get("volume_usd", 0)) < 0 for item in pairs):
                print("NEGATIVE ASSET-PAIR VOLUME")
                ok = False
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            print(f"INVALID ASSET-PAIR JSON: {exc}")
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

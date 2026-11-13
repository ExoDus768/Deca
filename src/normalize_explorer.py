"""Normalize deduplicated NEAR Intents Explorer snapshots into UTC daily metrics."""
import datetime as dt
import hashlib
import json
import os
import pathlib
from collections import defaultdict
from decimal import Decimal, InvalidOperation

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "intents_explorer"
METRICS = ROOT / "data" / "metrics"


def identity(row: dict) -> str:
    for field in ("transactionId", "id", "txHash", "transactionHash"):
        value = row.get(field)
        if value not in (None, ""):
            return f"{field}:{value}"
    address = row.get("depositAddress")
    if address not in (None, ""):
        memo = row.get("depositMemo")
        return f"deposit:{address}:{'' if memo is None else memo}"
    canonical = json.dumps(row, sort_keys=True, separators=(",", ":"), default=str)
    return "row:" + hashlib.sha256(canonical.encode()).hexdigest()


def ordered_snapshot_files():
    files = list(RAW.glob("*.json"))
    # Prefer the newest snapshot batch, then its earliest page, when rows repeat.
    def sort_key(path):
        name = path.name
        stamp, _, page = name.partition("-page-")
        try:
            page_number = int(page.split(".")[0])
        except ValueError:
            page_number = 0
        return (stamp, -page_number)
    return sorted(files, key=sort_key, reverse=True)


def main() -> None:
    files = ordered_snapshot_files()
    if not files:
        raise SystemExit("No Explorer snapshots found; run src/snapshot.py first.")

    seen = set()
    rows = []
    raw_rows = 0
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError(f"{path}: expected a JSON array of transactions")
        raw_rows += len(payload)
        for row in payload:
            key = identity(row)
            if key in seen:
                continue
            seen.add(key)
            rows.append(row)

    volume = defaultdict(Decimal)
    counts = defaultdict(int)
    skipped_missing_usd = 0
    success_rows = 0
    timestamps = []

    for row in rows:
        if row.get("status") != "SUCCESS":
            continue
        success_rows += 1
        timestamp = row.get("createdAtTimestamp")
        if timestamp is None:
            created = row.get("createdAt")
            if not created:
                continue
            parsed = dt.datetime.fromisoformat(created.replace("Z", "+00:00"))
            timestamp = int(parsed.timestamp())
        timestamp = int(timestamp)
        day = dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc).date().isoformat()
        timestamps.append(timestamp)
        counts[day] += 1

        raw_usd = row.get("amountInUsd")
        if raw_usd in (None, ""):
            skipped_missing_usd += 1
            continue
        try:
            value = Decimal(str(raw_usd))
        except InvalidOperation as exc:
            raise ValueError(f"Invalid amountInUsd value: {raw_usd!r}") from exc
        if value < 0:
            raise ValueError(f"Negative amountInUsd value: {raw_usd!r}")
        volume[day] += value

    # Preserve deeper historical days across daily runs. For overlapping dates,
    # keep the highest observed daily total; successful settlements are immutable,
    # and a shallower scheduled fetch must not erase a prior deeper backfill.
    volume_path = METRICS / "intents_daily_volume_usd.json"
    count_path = METRICS / "daily_transactions.json"
    try:
        previous_volume = json.loads(volume_path.read_text(encoding="utf-8")).get("series", {}).get("intents_explorer", {})
    except (FileNotFoundError, json.JSONDecodeError):
        previous_volume = {}
    try:
        previous_counts = json.loads(count_path.read_text(encoding="utf-8")).get("series", {}).get("intents_explorer", {})
    except (FileNotFoundError, json.JSONDecodeError):
        previous_counts = {}
    current_volume = {day: float(value) for day, value in volume.items()}
    current_counts = dict(counts)
    merged_volume = {
        day: max(float(previous_volume.get(day, 0)), float(current_volume.get(day, 0)))
        for day in set(previous_volume) | set(current_volume)
    }
    merged_counts = {
        day: max(int(previous_counts.get(day, 0)), int(current_counts.get(day, 0)))
        for day in set(previous_counts) | set(current_counts)
    }

    METRICS.mkdir(parents=True, exist_ok=True)
    latest_stamp = files[0].name.partition("-page-")[0]
    latest_batch = [p for p in files if p.name.startswith(latest_stamp + "-page-")]
    page_cap = int(os.environ.get("DECA_EXPLORER_MAX_PAGES", "100"))
    page_cap_reached = len(latest_batch) >= page_cap
    generated = dt.datetime.now(dt.timezone.utc).isoformat()
    common = {
        "adapter_version": "1.1.0",
        "source": "intents_explorer",
        "date_timezone": "UTC",
        "source_scope": "public 1Click swap transactions returned by Explorer API",
        "snapshot_files": [p.name for p in files],
        "snapshot_pages_retained": len(files),
        "latest_snapshot_pages": len(latest_batch),
        "configured_page_cap": page_cap,
        "page_cap_reached": page_cap_reached,
        "raw_rows": raw_rows,
        "unique_rows": len(rows),
        "duplicates_removed": raw_rows - len(rows),
        "series_merge_policy": "per-UTC-day maximum observed across committed snapshots; prevents a shallower refresh from erasing a deeper backfill",
        "series_days_retained": len(set(merged_volume) | set(merged_counts)),
        "successful_rows": success_rows,
        "excluded_non_success_rows": len(rows) - success_rows,
        "success_rate_pct": round(success_rows / len(rows) * 100, 4) if rows else None,
        "skipped_missing_usd_rows": skipped_missing_usd,
        "oldest_transaction_timestamp": min(timestamps) if timestamps else None,
        "newest_transaction_timestamp": max(timestamps) if timestamps else None,
        "generated_at_utc": generated,
        "coverage_warning": (
            "This metric covers unique transactions present in retained Explorer snapshots. "
            "The latest fetch reached its configured page cap; older history may remain."
            if page_cap_reached else
            "This metric covers unique transactions present in retained Explorer snapshots. "
            "A short or empty final page was not observed in the latest fetch; verify provider pagination semantics."
        ),
    }

    volume_doc = {
        "metadata": {**common, "unit": "USD",
            "definition": "Sum of Explorer amountInUsd for unique SUCCESS transactions, grouped by createdAtTimestamp UTC date."},
        "series": {"intents_explorer": dict(sorted(merged_volume.items()))},
    }
    count_doc = {
        "metadata": {**common, "unit": "transactions",
            "definition": "Count of unique Explorer SUCCESS transactions, grouped by createdAtTimestamp UTC date."},
        "series": {"intents_explorer": dict(sorted(merged_counts.items()))},
    }
    (METRICS / "intents_daily_volume_usd.json").write_text(
        json.dumps(volume_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    (METRICS / "daily_transactions.json").write_text(
        json.dumps(count_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Read {raw_rows} raw rows; retained {len(rows)} unique records; removed {raw_rows-len(rows)} duplicates.")
    print(f"Normalized {success_rows} unique successful settlements; retained {len(merged_volume)} UTC volume days across refreshes.")
    print(f"Latest fetch: {len(latest_batch)} pages; configured cap {page_cap}; cap reached={page_cap_reached}.")


if __name__ == "__main__":
    main()

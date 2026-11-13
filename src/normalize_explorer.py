"""Normalize the latest NEAR Intents Explorer snapshot into daily metrics.

Only SUCCESS rows contribute to settled volume and successful transaction counts.
All dates are UTC. The raw source snapshot remains the audit record.
"""
import datetime as dt
import json
import pathlib
from collections import defaultdict
from decimal import Decimal, InvalidOperation

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "intents_explorer"
METRICS = ROOT / "data" / "metrics"


def main() -> None:
    files = sorted(RAW.glob("*.json"))
    if not files:
        raise SystemExit("No Explorer snapshots found; run src/snapshot.py first.")

    rows = []
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError(f"{path}: expected a JSON array of transactions")
        rows.extend(payload)

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
        day = dt.datetime.fromtimestamp(int(timestamp), tz=dt.timezone.utc).date().isoformat()
        timestamps.append(int(timestamp))
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

    METRICS.mkdir(parents=True, exist_ok=True)
    common = {
        "adapter_version": "1.0.0",
        "source": "intents_explorer",
        "date_timezone": "UTC",
        "source_scope": "public 1Click swap transactions returned by Explorer API",
        "snapshot_files": [p.name for p in files],
        "raw_rows": len(rows),
        "successful_rows": success_rows,
        "excluded_non_success_rows": len(rows) - success_rows,
        "skipped_missing_usd_rows": skipped_missing_usd,
        "oldest_transaction_timestamp": min(timestamps) if timestamps else None,
        "newest_transaction_timestamp": max(timestamps) if timestamps else None,
        "coverage_warning": "This metric covers only the transactions present in the retained Explorer snapshots; it is not a complete historical total unless pagination/backfill coverage is complete."
    }

    volume_doc = {
        "metadata": {
            **common,
            "unit": "USD",
            "definition": "Sum of Explorer amountInUsd for SUCCESS transactions, grouped by createdAtTimestamp UTC date.",
        },
        "series": {"intents_explorer": {day: float(value) for day, value in sorted(volume.items())}},
    }
    count_doc = {
        "metadata": {
            **common,
            "unit": "transactions",
            "definition": "Count of Explorer SUCCESS transactions, grouped by createdAtTimestamp UTC date.",
        },
        "series": {"intents_explorer": dict(sorted(counts.items()))},
    }

    (METRICS / "intents_daily_volume_usd.json").write_text(
        json.dumps(volume_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    (METRICS / "daily_transactions.json").write_text(
        json.dumps(count_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"Normalized {len(rows)} raw records; {success_rows} successful settlements.")
    print(f"Created {len(volume_doc['series']['intents_explorer'])} daily USD-volume buckets.")


if __name__ == "__main__":
    main()

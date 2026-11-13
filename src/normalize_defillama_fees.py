"""Normalize DefiLlama NEAR protocol fees and revenue as parent-level context."""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "metrics" / "defillama_fees_revenue.json"

SOURCES = {
    "defillama_near_fees": "dailyFees",
    "defillama_near_revenue": "dailyRevenue",
}


def load_series(source: str):
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    files = sorted((RAW / source).glob("*.json"))
    files = [p for p in files if p.stem == today]
    if not files:
        return {}, "No fresh provider snapshot was collected."
    payload = json.loads(files[-1].read_text(encoding="utf-8"))
    chart = payload.get("totalDataChart")
    if not isinstance(chart, list) or not chart:
        raise ValueError("DefiLlama response has no totalDataChart series")
    series = {}
    for point in chart:
        if not isinstance(point, list) or len(point) < 2:
            continue
        day = dt.datetime.fromtimestamp(int(point[0]), tz=dt.timezone.utc).date().isoformat()
        value = float(point[1])
        if value < 0:
            raise ValueError("Negative daily value returned")
        series[day] = value
    if not series:
        raise ValueError("No valid daily points")
    return dict(sorted(series.items())), files[-1].name


def main():
    metadata = {
        "source": "DefiLlama",
        "status": "available",
        "unit": "USD",
        "adapter_version": "1.0.0",
        "source_scope": "NEAR Protocol parent protocol fee and revenue series; broader than NEAR Intents alone",
        "date_timezone": "UTC",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "methodology_url": "https://docs.llama.fi/analysts/data-definitions",
        "investment_caveat": "Protocol-level fees and revenue are not equivalent to NEAR token-holder value capture. This parent protocol series may include products beyond NEAR Intents.",
    }
    series = {}
    for source in SOURCES:
        try:
            values, file_name = load_series(source)
            series[source] = values
            metadata[source + "_snapshot"] = file_name
            if not values:
                metadata["status"] = "partial"
                metadata[source + "_note"] = file_name
        except Exception as exc:
            series[source] = {}
            metadata["status"] = "partial"
            metadata[source + "_note"] = f"{type(exc).__name__}: {exc}"[:250]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"metadata": metadata, "series": series}, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("Normalized DefiLlama daily fee/revenue context: " + ", ".join(f"{k}={len(v)} days" for k, v in series.items()))


if __name__ == "__main__":
    main()

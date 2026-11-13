"""Normalize DefiLlama's NEAR Intents fee and value-capture series."""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "metrics" / "defillama_fees_revenue.json"

SOURCES = {
    "defillama_intents_fees": "dailyFees",
    "defillama_intents_revenue": "dailyRevenue",
    "defillama_intents_protocol_revenue": "dailyProtocolRevenue",
    "defillama_intents_holders_revenue": "dailyHoldersRevenue",
    "defillama_intents_supply_side_revenue": "dailySupplySideRevenue",
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
        if not __import__("math").isfinite(value):
            raise ValueError("DefiLlama returned a non-finite value")
        series[day] = value
    if not series:
        raise ValueError("No valid daily points")
    return dict(sorted(series.items())), files[-1].name


def main():
    metadata = {
        "source": "DefiLlama",
        "status": "available",
        "unit": "USD",
        "adapter_version": "2.0.0",
        "source_scope": "NEAR Intents-specific fee adapter; all integrators, not only public 1Click Explorer transactions",
        "date_timezone": "UTC",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "methodology_url": "https://docs.llama.fi/analysts/data-definitions",
        "adapter_methodology_url": "https://github.com/DefiLlama/dimension-adapters/tree/master/fees/near-intents",
        "caveats": [
            "Fees are gross user swap fees, including protocol and affiliate/distribution fees.",
            "Revenue is NEAR's net captured revenue based on revenue-wallet sweeps.",
            "Holder revenue represents NEAR buybacks from captured Intents revenue since 2026-02-23; buybacks are not burns.",
            "Protocol revenue and holder revenue attribution is not a guarantee of direct spot-token price appreciation.",
            "This source covers all Intents integrators and therefore does not have identical scope to the public 1Click Explorer sample.",
        ],
    }
    series = {}
    for source, data_type in SOURCES.items():
        try:
            values, file_name = load_series(source)
            series[source] = values
            metadata[source + "_snapshot"] = file_name
            metadata[source + "_days"] = len(values)
            if not values:
                metadata["status"] = "partial"
                metadata[source + "_note"] = file_name
        except Exception as exc:
            series[source] = {}
            metadata["status"] = "partial"
            metadata[source + "_note"] = f"{type(exc).__name__}: {exc}"[:250]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"metadata": metadata, "series": series}, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("Normalized NEAR Intents-specific DefiLlama data: " + ", ".join(f"{k}={len(v)} days" for k, v in series.items()))


if __name__ == "__main__":
    main()

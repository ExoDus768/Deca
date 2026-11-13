"""Normalize DefiLlama daily DEX volume as separately scoped provider context."""
import datetime as dt
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "defillama_intents"
OUT = ROOT / "data" / "metrics" / "defillama_daily_volume_usd.json"


def unavailable(reason: str):
    doc = {
        "metadata": {
            "source": "defillama_intents",
            "status": "unavailable",
            "unit": "USD",
            "source_scope": "DefiLlama-reported NEAR Intents DEX spot-swap volume",
            "comparison_eligible": False,
            "note": reason[:300],
        },
        "series": {"defillama_intents": {}},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main():
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    files = sorted(p for p in RAW.glob("*.json") if p.stem == today)
    if not files:
        unavailable("No fresh DefiLlama snapshot was collected during this refresh.")
        print("DefiLlama context unavailable; Explorer metrics remain unaffected.")
        return

    try:
        payload = json.loads(files[-1].read_text(encoding="utf-8"))
        chart = payload.get("totalDataChart")
        if not isinstance(chart, list) or not chart:
            raise ValueError("DefiLlama response has no totalDataChart series")
        series = {}
        for point in chart:
            if not isinstance(point, list) or len(point) < 2:
                continue
            timestamp, value = point[0], point[1]
            day = dt.datetime.fromtimestamp(int(timestamp), tz=dt.timezone.utc).date().isoformat()
            numeric = float(value)
            if numeric < 0:
                raise ValueError("DefiLlama returned a negative daily volume")
            series[day] = numeric
        if not series:
            raise ValueError("DefiLlama daily chart contained no valid points")
    except Exception as exc:
        unavailable(f"Provider response could not be normalized: {type(exc).__name__}: {exc}")
        print(f"DefiLlama context unavailable: {type(exc).__name__}: {exc}")
        return

    doc = {
        "metadata": {
            "source": "defillama_intents",
            "status": "available",
            "unit": "USD",
            "adapter_version": "1.0.0",
            "source_scope": "DefiLlama-reported NEAR Intents DEX spot-swap volume",
            "definition": "Daily DEX volume from DefiLlama's NEAR Intents protocol summary totalDataChart.",
            "date_timezone": "UTC",
            "snapshot_file": files[-1].name,
            "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "comparison_eligible": False,
            "comparison_note": "Context only: DefiLlama's DEX volume scope is broader and is not assumed to match public 1Click Explorer rows. Do not calculate a reconciliation gap from these series.",
            "methodology_url": "https://docs.llama.fi/analysts/data-definitions",
        },
        "series": {"defillama_intents": dict(sorted(series.items()))},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"Normalized {len(series)} DefiLlama daily DEX-volume points as non-comparable provider context.")


if __name__ == "__main__":
    main()

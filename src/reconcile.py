"""Deterministic pairwise comparison of normalized daily metric series.

Each data/metrics/<metric>.json file has this shape:
{
  "metadata": {"unit": "USD", "definition": "...", "adapter_version": "1"},
  "series": {"source_a": {"2026-01-01": 123.4}, "source_b": {"2026-01-01": 120.0}}
}
"""
import itertools
import json
import pathlib
import statistics
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = ROOT / "sources.yaml"
METRICS = ROOT / "data" / "metrics"


def compare(left: dict, right: dict) -> dict:
    days = sorted(set(left) & set(right))
    if not days:
        return {"status": "no_overlap", "overlap_days": 0}
    gaps = [
        abs(float(left[day]) - float(right[day]))
        / max(abs(float(left[day])), abs(float(right[day])), 1e-12) * 100
        for day in days
    ]
    worst_index = max(range(len(gaps)), key=gaps.__getitem__)
    return {
        "status": "compared",
        "overlap_days": len(days),
        "median_gap_pct": round(statistics.median(gaps), 4),
        "max_gap_pct": round(gaps[worst_index], 4),
        "worst_day": days[worst_index],
    }


def run() -> dict:
    cfg = yaml.safe_load(CONFIG.read_text(encoding="utf-8"))["metrics"]
    output = {
        "project": "deca",
        "generated_from": "normalized metric files; deterministic offline computation",
        "metrics": {},
    }
    for metric, definition in cfg.items():
        path = METRICS / f"{metric}.json"
        if not path.exists():
            output["metrics"][metric] = {
                "status": "awaiting_normalized_data",
                "unit": definition.get("unit"),
                "definition": definition.get("definition"),
                "comparisons": {},
            }
            continue
        document = json.loads(path.read_text(encoding="utf-8"))
        series = document.get("series", {})
        comparisons = {}
        for a, b in itertools.combinations(definition["sources"], 2):
            if a not in series or b not in series:
                comparisons[f"{a} vs {b}"] = {"status": "missing_source_series"}
                continue
            result = compare(series[a], series[b])
            if result["status"] == "compared":
                result["tolerance_pct"] = definition["tolerance_pct"]
                result["within_tolerance"] = result["median_gap_pct"] <= definition["tolerance_pct"]
            comparisons[f"{a} vs {b}"] = result
        output["metrics"][metric] = {
            "status": "reconciled" if any(x.get("status") == "compared" for x in comparisons.values()) else "insufficient_comparable_data",
            "unit": document.get("metadata", {}).get("unit", definition.get("unit")),
            "definition": document.get("metadata", {}).get("definition", definition.get("definition")),
            "metadata": document.get("metadata", {}),
            "comparisons": comparisons,
        }
    return output


if __name__ == "__main__":
    json.dump(run(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")

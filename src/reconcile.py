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
    # Provider context is surfaced separately when its scope is not like-for-like.
    context_path = METRICS / "defillama_daily_volume_usd.json"
    if context_path.exists():
        context_doc = json.loads(context_path.read_text(encoding="utf-8"))
        context_meta = context_doc.get("metadata", {})
        context_series = context_doc.get("series", {}).get("defillama_intents", {})
        explorer_path = METRICS / "intents_daily_volume_usd.json"
        explorer_doc = json.loads(explorer_path.read_text(encoding="utf-8")) if explorer_path.exists() else {}
        explorer_series = explorer_doc.get("series", {}).get("intents_explorer", {})
        overlap = sorted(set(context_series) & set(explorer_series))
        diagnostic = compare(explorer_series, context_series) if overlap else {"status": "no_overlap", "overlap_days": 0}
        latest_overlap_day = overlap[-1] if overlap else None
        output["provider_context"] = {
            "defillama_intents": {
                "status": context_meta.get("status", "unknown"),
                "source_scope": context_meta.get("source_scope"),
                "comparison_eligible": False,
                "comparison_type": "scope_mismatch_diagnostic_only",
                "overlap_days": len(overlap),
                "diagnostic_comparison": diagnostic,
                "latest_overlap_day": latest_overlap_day,
                "latest_explorer_usd": float(explorer_series[latest_overlap_day]) if latest_overlap_day else None,
                "latest_defillama_usd": float(context_series[latest_overlap_day]) if latest_overlap_day else None,
                "note": "Side-by-side daily USD volume diagnostic only. Explorer public 1Click swaps and DefiLlama protocol DEX volume may have different coverage and inclusion rules. Gap statistics are not a formal reconciliation and must not be described as one.",
                "latest_day": max(context_series) if context_series else None,
            }
        }
    return output


if __name__ == "__main__":
    json.dump(run(), sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")

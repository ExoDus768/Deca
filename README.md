# deca — NEAR on the evidence, reconciled and re-runnable

**Investment Thesis track project.** deca is an evidence and reconciliation pipeline for NEAR ecosystem metrics. It is designed to compare the same metric from independent providers, publish the differences, and make every result reproducible in CI.

> No headline metric is treated as verified until its source, unit, time window, methodology, and raw snapshot are recorded. Missing or incomparable data is reported, never silently filled.

## Current status

This repository is the reproducible project scaffold. Provider endpoints and metric adapters are deliberately marked **unverified** until checked against current provider documentation. The first CI run validates repository integrity and deterministic publication; it does not claim that live metrics have been reconciled yet.

## Workflow

```bash
python -m pip install -r requirements.txt
make publish
make verify
```

- `make refresh` fetches configured HTTP JSON sources and records SHA-256 hashes.
- `make publish` recomputes pairwise metric comparisons into `published/reconciliation.json`.
- `make verify` runs offline: checks snapshot hashes and confirms published output matches a fresh computation.

## Project layout

- `sources.yaml`: provider endpoints and metric definitions.
- `data/raw/`: immutable-by-convention source snapshots, organized by provider/date.
- `data/metrics/`: normalized daily metric series, one JSON file per metric.
- `data/manifest.json`: SHA-256 hashes for raw snapshots.
- `sql/`: reproducible query used for the BigQuery transaction cross-check.
- `src/`: snapshot, reconciliation, and verification code.
- `published/`: judge-facing machine-readable reconciliation output.
- `.github/workflows/verify.yml`: offline verification on every push and pull request.

## Evidence rules

1. Compare like with like: same unit, chain scope, date boundaries, and inclusion rules.
2. Keep provider-native values and metadata in raw snapshots.
3. Normalize only through documented adapters; retain the adapter/version in the metric record.
4. Publish overlap coverage, median and maximum absolute percentage gap, worst date, and tolerance result.
5. A missing source or empty overlap is **unknown**, not zero and not agreement.
6. Never describe a source as independent until its underlying data lineage is understood.

## Data-source status

See `sources.yaml`. Placeholder endpoints are intentionally disabled. Do not run a live refresh until each URL and response schema has been verified against provider documentation.

## BigQuery note

The SQL is a starting query, not yet a verified source of the same transaction definition as NEARBlocks. Confirm the public table schema and timestamp units before using its output as a reconciliation peer.

## Investment thesis

The thesis must be generated from reconciled evidence, not from a preferred dashboard number. Each claim should cite the metric artifact, date range, source pair, observed gap, and limitations. This section will be expanded after the first valid data run.

## License

MIT — see `LICENSE`.

# deca — NEAR on the evidence, reconciled and re-runnable

**Investment Thesis track project.** deca is an evidence and reconciliation pipeline for NEAR ecosystem metrics. It is designed to compare the same metric from independent providers, publish the differences, and make every result reproducible in CI.

> No headline metric is treated as verified until its source, unit, time window, methodology, and raw snapshot are recorded. Missing or incomparable data is reported, never silently filled.

## Current status

The authenticated NEAR Intents Explorer connection is live. Each manual refresh now follows the documented deposit-address/memo cursor, fetching up to 100 pages of 1,000 records (100,000 maximum) with a 5.1-second pause between requests to respect the partner rate limit. Each page is retained as a separate raw snapshot and included in the SHA-256 manifest. The workflow then normalizes successful settlements into UTC daily USD-volume and transaction-count series. The page cap is configurable with `DECA_EXPLORER_MAX_PAGES` (currently set to 100); reaching the cap does not prove that all historical records have been retrieved. DefiLlama, NearBlocks, and NearStats remain disabled pending adapter and lineage validation.

## Workflow

```bash
python -m pip install -r requirements.txt
make publish
make verify
```

- `make refresh` fetches configured HTTP JSON sources and records SHA-256 hashes.
- `python src/normalize_explorer.py` builds daily UTC volume and successful-transaction metrics from Explorer snapshots.
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

See `sources.yaml` and `docs/source-lineage.md`. The Explorer API requires a partner JWT and exposes public 1Click swap history; DefiLlama's protocol page publishes DEX volume; NearStats explicitly describes its headline volume as sourced from NEAR first-party totals and its public component as matching the Explorer. Therefore NearStats is a derived cross-check, not an independent peer for those totals.

## BigQuery note

The SQL is a starting query, not yet a verified source of the same transaction definition as NEARBlocks. Confirm the public table schema and timestamp units before using its output as a reconciliation peer.

## Investment thesis

The thesis must be generated from reconciled evidence, not from a preferred dashboard number. Each claim should cite the metric artifact, date range, source pair, observed gap, and limitations. This section will be expanded after the first valid data run.

## License

MIT — see `LICENSE`.


## Dashboard and deployment

Deca includes a Next.js dashboard in `app/`. It is designed to read the normalized public metric files from `data/metrics/` and the reconciliation report from `published/`. The Explorer refresh workflow now normalizes the latest collected snapshot, runs `make publish`, commits the public metric JSON files, and uploads the raw evidence as a short-lived GitHub Actions artifact. Raw transaction snapshots and the Explorer JWT are not exposed to the browser.

### Run locally

```bash
npm install
npm run dev
```

The dashboard is available at `http://localhost:3000`. To build for production, run `npm run build`.

### Vercel

The production dashboard is configured as a Next.js project on Vercel and is connected to this GitHub repository. Pushes to `main` can trigger a deployment. No Explorer API token is required in Vercel: the token remains a GitHub Actions secret and only normalized public metric files are committed for dashboard display.

### Data interpretation

The dashboard deliberately shows an empty state until metric files are published. It must not turn an unavailable metric into zero, and it labels the Explorer series as public 1Click coverage rather than total NEAR Intents activity. The 100-page fetch cap is a collection limit, not proof of complete history.

# deca — NEAR on the evidence, reconciled and re-runnable

**Investment Thesis track project.** deca is an evidence and reconciliation pipeline for NEAR ecosystem metrics. It is designed to compare the same metric from independent providers, publish the differences, and make every result reproducible in CI.

> No headline metric is treated as verified until its source, unit, time window, methodology, and raw snapshot are recorded. Missing or incomparable data is reported, never silently filled.

## Current status

The authenticated NEAR Intents Explorer connection is live. Each manual refresh now follows the documented deposit-address/memo cursor, fetching up to 100 pages of 1,000 records on the scheduled refresh (100,000 maximum); manual backfills can request up to 500 pages (500,000 maximum) with a 5.1-second pause between requests to respect the partner rate limit. Each page is retained as a separate raw snapshot and included in the SHA-256 manifest. The workflow then normalizes successful settlements into UTC daily USD-volume and transaction-count series. The page cap is configurable with `DECA_EXPLORER_MAX_PAGES` (currently set to 100); reaching the cap does not prove that all historical records have been retrieved. DefiLlama is collected as a separate provider-context series. Its NEAR Intents DEX volume is compared with public 1Click Explorer volume only as a scope-mismatch diagnostic. The dedicated DefiLlama NEAR Intents fee adapter supplies gross fees, net captured revenue, protocol revenue, holder buybacks and solver/distribution-side revenue from December 2024 onward; these metrics cover all integrators and have different scopes from the public 1Click sample. NearBlocks and NearStats remain candidates for further source-lineage validation. Repeated Explorer snapshots are de-duplicated by transaction ID or deposit-address/memo identity before metrics are calculated.

## Workflow

```bash
python -m pip install -r requirements.txt
make publish
make verify
```

- `make refresh` fetches configured HTTP JSON sources and records SHA-256 hashes.
- `python src/normalize_explorer.py` builds daily UTC volume, successful-transaction, success-rate, integrity and asset-pair metrics from Explorer snapshots.
- `python src/normalize_defillama.py` normalizes DefiLlama daily Intents DEX volume as separate, non-comparable provider context.
- `python src/normalize_defillama_fees.py` normalizes the dedicated DefiLlama NEAR Intents daily fees, captured revenue, protocol revenue, holder buybacks and solver/distribution revenue series.
- `make publish` recomputes pairwise metric comparisons and the clearly labeled DefiLlama scope-mismatch diagnostic into `published/reconciliation.json`.
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

The thesis must be generated from evidence, not from a preferred dashboard number. Deca reports observed daily volume, transaction activity, average ticket size, daily settlement success rates, asset-pair concentration, cross-provider diagnostic gaps, coverage quality and source limitations. It explicitly separates provider-context metrics when definitions differ. A short or page-capped sample is not sufficient to claim sustained adoption, retention, profitability or token value.

## License

MIT — see `LICENSE`.


## Dashboard and deployment

Deca includes a Next.js multi-page research workspace in `app/`: Overview, Analytics, Investment Signals, Methodology and Documentation. A top-left menu navigates between them. Analytics supports custom date windows, 7/30/90-day presets, hourly/daily/weekly/monthly aggregation, volume, transaction, average-ticket and success-rate indicators, previous-period comparisons, filters, tables and CSV export. It reads normalized public metric files from `data/metrics/` and the reconciliation report from `published/`. The Explorer refresh workflow now normalizes the latest collected snapshot, runs `make publish`, commits the public metric JSON files, and uploads the raw evidence as a short-lived GitHub Actions artifact. Raw transaction snapshots and the Explorer JWT are not exposed to the browser.

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


## Re-run the evidence pipeline

The Explorer JWT is required for the authenticated Explorer fetch. Set it locally as an environment variable; never commit it, paste it into source files, or add it to Vercel.

```bash
git clone https://github.com/ExoDus768/Deca.git
cd Deca
python -m pip install -r requirements.txt
export NEAR_INTENTS_EXPLORER_TOKEN="YOUR_JWT"
DECA_EXPLORER_MAX_PAGES=200 python src/snapshot.py
python src/normalize_explorer.py
python src/normalize_defillama.py
python src/normalize_defillama_fees.py
make publish
make verify
```

DefiLlama endpoints are public and are fetched by the same snapshot command. To run the scheduled/hosted workflow, open [GitHub Actions](https://github.com/ExoDus768/Deca/actions), select **Explorer API refresh**, and dispatch it with a page limit. The workflow stores the JWT in GitHub Actions Secrets and publishes only normalized public metrics.

The investment page displays a falsifiable thesis, the currently measurable pillars, a diagnostic cross-provider gap when overlapping data exists, and explicit conditions that would strengthen or weaken the thesis. DefiLlama NEAR Intents fees and captured revenue are Intents-specific across integrators. Holder revenue represents buybacks from 2026-02-23 onward; buybacks are not burns and do not by themselves establish lasting per-token value capture.

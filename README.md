# Deca

**Evidence-led research and investment analysis for NEAR Intents.**

Deca collects public NEAR Intents activity data, normalizes it into daily metrics, compares provider datasets where possible, and publishes a reproducible evidence trail. Its dashboard is designed to help researchers distinguish observed activity from assumptions about adoption and token value capture.

> **Research principle:** a metric is only as useful as its source, definition, coverage, time window, and limitations. Deca keeps those details visible and treats missing or incomparable data as unknown—not zero.

## Live dashboard

- **[Investment thesis](https://deca-dashboard.vercel.app/investment)** — thesis, evidence pillars, current sample, risks, and falsifiable tests.
- **[Analytics](https://deca-dashboard.vercel.app/analytics)** — daily activity metrics, date filters, comparisons, charts, and CSV export.
- **[Methodology](https://deca-dashboard.vercel.app/methodology)** — metric definitions and collection/normalization approach.
- **[Documentation](https://deca-dashboard.vercel.app/docs)** — project documentation.
- **[GitHub Actions](https://github.com/ExoDus768/Deca/actions)** — refresh and verification workflows.

## What Deca measures

### 1. Public 1Click activity

The authenticated NEAR Intents Explorer feed provides public 1Click swap history. Deca normalizes successful settlements into daily UTC series, including:

- USD volume
- Successful transaction count
- Daily settlement success rate
- Average swap size
- Asset-pair activity and concentration
- Collection and normalization integrity information

**Scope warning:** public 1Click activity is not the entirety of NEAR Intents usage. Do not interpret it as every integrator, wallet, solver, or application using Intents.

### 2. Provider context and comparison

DefiLlama data is collected separately and retained with its own definitions and coverage. Deca compares overlapping daily observations only as a diagnostic when provider scopes differ. A difference is not automatically an error, and a small gap is not proof that two providers measure the same thing.

The project also includes a dedicated DefiLlama NEAR Intents fee adapter for:

- Gross fees
- Net captured revenue
- Protocol revenue
- Holder buybacks
- Solver/distribution-side revenue

These fee and revenue series cover NEAR Intents across integrators and therefore have a different scope from the public 1Click Explorer sample.

### 3. Evidence quality

Deca records raw source snapshots and SHA-256 hashes, de-duplicates repeated Explorer records before aggregation, and publishes data-quality and reconciliation outputs. Collection limits and missing history are disclosed rather than silently extrapolated.

## Current sample: November 9–13, 2026

The latest five-day public 1Click sample currently displayed by the dashboard shows:

| Measure | Observed result |
|---|---:|
| Total volume | **$205.73M** |
| Average daily volume | **$41.15M** |
| Daily volume range | **$31.08M–$48.68M** |
| Daily settlement success-rate range | **97.02%–98.67%** |
| Weighted average swap size | **about $2,070** |

These are observations from a short, recent sample—not a forecast or proof of durable growth. See the live [Analytics](https://deca-dashboard.vercel.app/analytics) and [Investment](https://deca-dashboard.vercel.app/investment) pages for the published series and methodology.

## Investment thesis

**NEAR can become a durable cross-chain execution and distribution layer if Intents usage compounds and that activity converts into protocol economics.**

The available data makes this a thesis worth investigating, not a conclusion already proven. Recent public 1Click activity is meaningful in scale, but a five-day sample cannot establish a durable trend. Deca therefore separates three questions:

1. **Is usage growing?** Track volume, successful settlements, average ticket size, asset-pair mix, and coverage over longer windows.
2. **Does activity create protocol economics?** Track Intents-specific fees and captured revenue, and distinguish protocol revenue from solver/distribution shares.
3. **Can the evidence be independently checked?** Compare providers only over shared dates and definitions, and explain any persistent differences.

### What would strengthen the thesis

- Sustained volume and transaction growth across multiple 90-day windows and consecutive quarters.
- Explorer activity corroborating broader provider trends where scopes overlap.
- Captured revenue remaining a meaningful share of gross fees over consecutive quarters, with the proposed threshold and calculation disclosed.
- A stable, explainable cross-provider difference over at least 30 overlapping days after accounting for definition and coverage differences.

### What would weaken the thesis

- Activity growth that disappears when the sample window is extended or collection coverage improves.
- Fees that do not translate into meaningful captured protocol economics.
- Persistent unexplained divergence between providers.
- Evidence that activity is highly concentrated, temporary, or not retained across applications and users.

### Token-value caution

Protocol activity does not automatically accrue value to the NEAR token. Holder revenue includes buybacks from February 23, 2026 onward; buybacks are not burns. Any token-level assessment must also consider issuance, unlocks, dilution, and the actual mechanism by which protocol economics reach token holders.

## Data sources and limitations

- **NEAR Intents Explorer:** authenticated partner feed for public 1Click swap history. Requires a partner JWT for collection.
- **DefiLlama:** public DEX-volume provider context and a dedicated NEAR Intents fees/revenue series. Its volume scope differs from the public 1Click Explorer feed.
- **NearStats / NearBlocks:** tracked as potential cross-checks, subject to source-lineage and metric-definition validation. A derived series should not be described as an independent source.
- **BigQuery SQL:** included as a starting point for a transaction-level cross-check; its schema and timestamp units must be verified before treating it as an equivalent reconciliation source.

See [sources.yaml](./sources.yaml) and [source lineage notes](./docs/source-lineage.md) for endpoints, definitions, and provider status.

## Reproduce the pipeline

### Requirements

- Python 3.12 recommended
- Node.js and npm for the dashboard
- A NEAR Intents Explorer partner JWT for authenticated Explorer collection

### 1. Clone and install

```bash
git clone https://github.com/ExoDus768/Deca.git
cd Deca
python -m pip install -r requirements.txt
```

### 2. Configure the Explorer credential

Set the JWT in your shell or local environment. Do not commit it, put it in source code, or expose it in the browser.

```bash
export NEAR_INTENTS_EXPLORER_TOKEN="YOUR_JWT"
```

### 3. Fetch and normalize data

```bash
DECA_EXPLORER_MAX_PAGES=200 python src/snapshot.py
python src/normalize_explorer.py
python src/normalize_defillama.py
python src/normalize_defillama_fees.py
make publish
make verify
```

The Explorer page limit is configurable. A page cap limits the amount of history collected; reaching it does **not** mean all historical records have been retrieved. Respect the partner API rate limit and use the workflow's supported page-limit settings when running a hosted refresh.

### 4. Run the dashboard locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For a production build:

```bash
npm run build
```

## Automated refresh and deployment

- The **Explorer API refresh** workflow can be dispatched from [GitHub Actions](https://github.com/ExoDus768/Deca/actions).
- Store `NEAR_INTENTS_EXPLORER_TOKEN` as a GitHub Actions repository secret. Never place the JWT in a committed file or Vercel environment variable.
- The refresh workflow collects raw Explorer pages, normalizes the latest data, publishes metric JSON files, and commits the public normalized outputs.
- Raw transaction snapshots and the Explorer JWT are not exposed to the browser.
- The dashboard is deployed on Vercel at [deca-dashboard.vercel.app](https://deca-dashboard.vercel.app). The Vercel project is connected to this GitHub repository; pushes to `main` can trigger production deployment.
- The offline verification workflow checks reproducibility on pushes and pull requests.

## Repository structure

```text
.
├── app/                    # Next.js dashboard routes and UI
├── data/
│   ├── raw/                # Collected source snapshots (not browser data)
│   └── metrics/            # Normalized daily metric JSON files
├── docs/                   # Methodology and source-lineage documentation
├── published/              # Reconciliation and published evidence outputs
├── sql/                    # Exploratory BigQuery cross-check SQL
├── src/                    # Fetching, normalization, publishing, verification
├── .github/workflows/      # Refresh and verification automation
├── sources.yaml            # Provider configuration and metric definitions
├── Makefile                # Reproducible pipeline commands
└── requirements.txt        # Python dependencies
```

## Evidence and methodology rules

1. Compare like with like: unit, chain and product scope, date boundary, and inclusion rules must match.
2. Preserve provider-native payloads and metadata in raw snapshots.
3. Normalize through documented adapters and retain their provenance.
4. Publish overlap coverage and gap statistics for comparisons.
5. Treat missing data, empty overlap, or unverified lineage as **unknown**.
6. Do not label a provider independent until its underlying data lineage is understood.
7. Distinguish gross fees, captured revenue, protocol revenue, holder buybacks, and solver/distribution revenue.
8. Never infer retention, organic growth, profitability, or token value capture from a short or incomplete sample.

## Contributing

Issues and pull requests are welcome. When proposing a metric or provider, include its source, exact definition, unit, chain/product scope, date semantics, coverage, and any known dependencies on other providers. Avoid committing credentials, private transaction data, or unredacted secrets.

## License

This project is licensed under the [MIT License](./LICENSE).

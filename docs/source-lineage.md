# Source lineage and comparability audit

Audit date: 2026-11-13

This document records what each source can establish and what it cannot. A URL is not proof of independence.

| Source | Access / endpoint | What it reports | Lineage and limitation | Current use |
|---|---|---|---|---|
| NEAR Intents Explorer | `https://explorer.near-intents.org/api/v0/transactions`; partner JWT required | Historical 1Click swap transactions | First-party Explorer; public swaps. Confidential Intents are not visible in public Explorer history. | Candidate public-swap source |
| DefiLlama | `https://api.llama.fi/protocol/near-intents` | Protocol TVL and DEX volume time series | DefiLlama defines DEX volume as all spot token swaps on the DEX. Need inspect API payload and align its start date, UTC boundaries and coverage with Explorer. | Candidate comparison source; lineage needs review |
| NearBlocks | `https://nearblocks.io/near-intents` | NEAR Intents dashboard with daily volume, swaps, users, chains and assets | Dashboard is discoverable, but a stable documented API endpoint and precise inclusion/de-duplication methodology have not yet been verified. | Research target; not wired into refresh |
| NearStats | `https://nearstats.org/api/near/summary` | Public JSON summary and headline volume | Its published methodology says headline totals include Confidential Intents and come from NEAR first-party daily figures; public volume matches the Explorer. It also cross-checks DefiLlama and NearBlocks. This is a derived aggregator, not an independent peer for the same headline total. | Secondary validation and methodology reference only |
| NEAR RPC | `https://rpc.mainnet.near.org` | Network status and chain metadata | Independent protocol-health context, not Intents volume. | Context only |

## Critical scope distinction

The Explorer's public volume and NEAR's headline total are not automatically the same metric. NearStats' methodology explains that its headline includes public swaps plus Confidential Intents, while the public Explorer covers only public swaps. Comparing these totals without separating confidential volume would create a misleading discrepancy.

## First reconciliation target

Start with **public 1Click swap volume only**:

1. Pull successful public swap records from the Explorer API using a partner JWT stored as `NEAR_INTENTS_EXPLORER_TOKEN`.
2. Retrieve DefiLlama's NEAR Intents protocol time series.
3. Inspect both raw schemas and determine whether DefiLlama's DEX volume includes the same public swap universe, valuation timestamps and UTC day boundaries.
4. If definitions align, normalize daily USD volume and compare. If they do not align, publish the scope mismatch rather than manufacturing a percentage gap.
5. Add NearBlocks only after its API and methodology are independently verified.

## References

- NEAR Intents Explorer API docs: https://docs.agentsonintents.com/integration/distribution-channels/1click-api/explorer/introduction
- NEAR Intents Explorer: https://explorer.near-intents.org/
- DefiLlama NEAR Intents protocol page and methodology: https://defillama.com/protocol/near-intents
- DefiLlama protocol API: https://api.llama.fi/protocol/near-intents
- NearBlocks NEAR Intents dashboard: https://nearblocks.io/near-intents
- NearStats methodology: https://nearstats.org/methodology
- NearStats JSON summary: https://nearstats.org/api/near/summary

No live figures are copied into this audit. Endpoint/schema validation and a reproducible data pull are the next implementation step.

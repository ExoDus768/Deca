# Source lineage and comparability audit

Audit date: 2026-11-13

This document records what each source can establish and what it cannot. A URL is not proof of independence.

| Source | Access / endpoint | What it reports | Lineage and limitation | Current use |
|---|---|---|---|---|
| NEAR Intents Explorer | `https://explorer.near-intents.org/api/v0/transactions`; partner JWT required | Historical 1Click swap transactions | First-party Explorer; public swaps. Confidential Intents are not visible in public Explorer history. | Candidate public-swap source |
| DefiLlama DEX volume | `https://api.llama.fi/summary/dexs/near-intents?dataType=dailyVolume` | NEAR Intents DEX daily volume | Separate provider aggregation; scope may include more integrators than public 1Click Explorer. Its daily gap is published as a diagnostic, not a formal reconciliation. | Live provider context and scope-mismatch diagnostic |
| DefiLlama NEAR Intents fees | `https://api.llama.fi/summary/fees/near-intents?dataType=dailyFees` | Gross Intents swap fees across integrators | DefiLlama adapter sources fees from Dune NEAR Intents fee datasets. Begins 2024-12-10. | Live economics series |
| DefiLlama NEAR Intents revenue | `https://api.llama.fi/summary/fees/near-intents?dataType=dailyRevenue` | NEAR net captured Intents revenue | Derived from NEAR/wNEAR transfers into designated revenue wallets; not equal to gross fees. | Live economics series |
| DefiLlama holder revenue | `https://api.llama.fi/summary/fees/near-intents?dataType=dailyHoldersRevenue` | NEAR Intents revenue used for NEAR buybacks since 2026-02-23 | Buybacks are not burns; they are reported as holder revenue by the adapter. | Token-value-capture evidence, with caveats |
| DefiLlama protocol / supply-side revenue | `dailyProtocolRevenue` and `dailySupplySideRevenue` data types on the same summary endpoint | Treasury-retained revenue before buybacks and solver/distribution share | Revenue attribution follows DefiLlama's fee definitions; daily revenue sweeps can differ from accrued fees. | Economics split and quality context |
| NearBlocks | `https://nearblocks.io/near-intents` | NEAR Intents dashboard with daily volume, swaps, users, chains and assets | Dashboard is discoverable, but a stable documented API endpoint and precise inclusion/de-duplication methodology have not yet been verified. | Research target; not wired into refresh |
| NearStats | `https://nearstats.org/api/near/summary` | Public JSON summary and headline volume | Its published methodology says headline totals include Confidential Intents and come from NEAR first-party daily figures; public volume matches the Explorer. It also cross-checks DefiLlama and NearBlocks. This is a derived aggregator, not an independent peer for the same headline total. | Secondary validation and methodology reference only |
| NEAR RPC | `https://rpc.mainnet.near.org` | Network status and chain metadata | Independent protocol-health context, not Intents volume. | Context only |

## Critical scope distinction

The Explorer's public volume and NEAR's headline total are not automatically the same metric. NearStats' methodology explains that its headline includes public swaps plus Confidential Intents, while the public Explorer covers only public swaps. Comparing these totals without separating confidential volume would create a misleading discrepancy.

## Current cross-provider diagnostic

Deca retrieves successful public 1Click swap records from the Explorer and DefiLlama's NEAR Intents DEX daily volume. It calculates a median and maximum daily percentage gap over shared UTC dates and publishes the overlap count and latest paired values. The result is explicitly a **scope-mismatch diagnostic**, because DefiLlama's aggregate may cover a broader integrator set than the public Explorer sample. It must not be called a formal like-for-like reconciliation until the inclusion rules are aligned.

## Economics and token value capture

The dedicated DefiLlama NEAR Intents fee adapter begins on 2024-12-10. It reports gross user fees, net revenue captured by NEAR, solver/distribution-side revenue, protocol revenue and holder revenue. Since 2026-02-23, captured revenue used to buy back NEAR is categorized as holder revenue. Buybacks are not burns and do not establish price appreciation or per-token value capture after dilution.

1. Compare gross fees with captured revenue to understand how much of user fees NEAR captures.
2. Separate protocol revenue from holder revenue and solver/distribution share.
3. Compare buybacks with issuance, unlocks and circulating-supply dilution before making a token valuation claim.
4. Extend historical Explorer coverage independently; do not imply that its short public 1Click sample spans the same history as DefiLlama's fees adapter.

## References

- NEAR Intents Explorer API docs: https://docs.agentsonintents.com/integration/distribution-channels/1click-api/explorer/introduction
- NEAR Intents Explorer: https://explorer.near-intents.org/
- DefiLlama NEAR Intents fee adapter: https://github.com/DefiLlama/dimension-adapters/tree/master/fees/near-intents
- DefiLlama data definitions: https://docs.llama.fi/analysts/data-definitions
- DefiLlama NEAR Intents DEX summary: https://api.llama.fi/summary/dexs/near-intents
- NearBlocks NEAR Intents dashboard: https://nearblocks.io/near-intents
- NearStats methodology: https://nearstats.org/methodology
- NearStats JSON summary: https://nearstats.org/api/near/summary

Source schemas and methodology are documented above. Live metric values are generated from the daily refresh and retained raw snapshots, not copied into this audit.

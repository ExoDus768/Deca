import fs from "node:fs";
import path from "node:path";
import RefreshButton from "./refresh-button";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, Clock3, Database, FileCheck2, Layers3, ShieldCheck, TrendingUp } from "lucide-react";

type MetricDoc = {
  metadata?: Record<string, any>;
  series?: Record<string, Record<string, number>>;
};
function readJson(file: string): MetricDoc | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")); }
  catch { return null; }
}
const volumeDoc = readJson("data/metrics/intents_daily_volume_usd.json");
const txDoc = readJson("data/metrics/daily_transactions.json");
const llamaDoc = readJson("data/metrics/defillama_daily_volume_usd.json");
const reconciliation = readJson("published/reconciliation.json");
const volumeSeries = volumeDoc?.series?.intents_explorer ?? {};
const txSeries = txDoc?.series?.intents_explorer ?? {};
const llamaSeries = llamaDoc?.series?.defillama_intents ?? {};
const volumeRows = Object.entries(volumeSeries).sort(([a], [b]) => a.localeCompare(b));
const txRows = Object.entries(txSeries).sort(([a], [b]) => a.localeCompare(b));
const volumeTotal = volumeRows.reduce((sum, [, value]) => sum + Number(value || 0), 0);
const txTotal = txRows.reduce((sum, [, value]) => sum + Number(value || 0), 0);
const ready = volumeTotal > 0 && txTotal > 0;
const averageDailyVolume = volumeRows.length ? volumeTotal / volumeRows.length : 0;
const averageDailyTransactions = txRows.length ? txTotal / txRows.length : 0;
const averageTicket = txTotal ? volumeTotal / txTotal : 0;
const peakDay = volumeRows.reduce<[string, number] | null>((best, row) => !best || row[1] > best[1] ? row : best, null);
const latestVolume = volumeRows.at(-1);
const previousVolume = volumeRows.at(-2);
const latestTx = txRows.at(-1);
const previousTx = txRows.at(-2);
const dayChange = previousVolume && latestVolume ? (latestVolume[1] - previousVolume[1]) / Math.max(previousVolume[1], 1) * 100 : null;
const txChange = previousTx && latestTx ? (latestTx[1] - previousTx[1]) / Math.max(previousTx[1], 1) * 100 : null;
const meta = volumeDoc?.metadata ?? {};
const llamaMeta = llamaDoc?.metadata ?? {};
const llamaAvailable = llamaMeta.status === "available" && Object.keys(llamaSeries).length > 0;
const llamaRows = Object.entries(llamaSeries).sort(([a], [b]) => a.localeCompare(b));
const maxVolume = Math.max(1, ...volumeRows.map(([, value]) => value));
const maxTx = Math.max(1, ...txRows.map(([, value]) => value));
const maxLlama = Math.max(1, ...llamaRows.map(([, value]) => value));
function compact(value: number, currency = false) {
  if (!Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  return currency ? "$" + formatted : formatted;
}
function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
function pct(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return (value > 0 ? "+" : "") + value.toFixed(1) + "%";
}
function shortDate(value: string) {
  return new Date(value + "T00:00:00Z").toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
}
function timestamp(value: number | null | undefined) {
  return value ? new Date(value * 1000).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "Not available";
}
function changeClass(value: number | null) {
  return value === null ? "" : value >= 0 ? "positive" : "negative";
}

export default function Home() {
  const coverageDays = volumeRows.length;
  const capReached = Boolean(meta.page_cap_reached);
  const sourceStatus = llamaAvailable ? "Provider context available" : "Provider context pending";
  const thesisHorizon = coverageDays >= 14 && !capReached ? "Multi-week sample" : "Early sample";
  return <main>
    <nav className="nav wrap">
      <a className="brand" href="#"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></a>
      <div className="nav-links"><a href="#dashboard">Overview</a><a href="#research">Research notes</a><a href="#methodology">Methodology</a><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14}/></a></div>
      <RefreshButton />
    </nav>

    <section className="dashboard wrap" id="dashboard">
      <div className="section-head"><div><div className="eyebrow">ECOSYSTEM INTELLIGENCE <span className="eyebrow-index">/ 01</span></div><h2>NEAR Intents overview</h2><p>Evidence-led view of public 1Click activity and provider-reported context.</p></div><span className={ready ? "status good" : "status pending"}><i/>{ready ? "Metrics published" : "Waiting for verified data"}</span></div>

      <div className="stats stats-four">
        <article className="stat stat-primary"><div className="stat-label">Observed successful volume <BarChart3 size={17}/></div><strong>{ready ? compact(volumeTotal, true) : "—"}</strong><small>USD · public 1Click Explorer</small><span className="stat-index">01</span></article>
        <article className="stat"><div className="stat-label">Successful transactions <Activity size={17}/></div><strong>{ready ? compact(txTotal) : "—"}</strong><small>Unique SUCCESS records</small><span className="stat-index">02</span></article>
        <article className="stat"><div className="stat-label">Average swap size <Layers3 size={17}/></div><strong>{ready ? compact(averageTicket, true) : "—"}</strong><small>Observed volume ÷ successful swaps</small><span className="stat-index">03</span></article>
        <article className="stat"><div className="stat-label">Success rate <CheckCircle2 size={17}/></div><strong>{meta.success_rate_pct != null ? Number(meta.success_rate_pct).toFixed(1) + "%" : "—"}</strong><small>Of unique Explorer records</small><span className="stat-index">04</span></article>
      </div>

      <div className="substats">
        <div><span>UTC date coverage</span><strong>{coverageDays ? shortDate(volumeRows[0][0]) + " — " + shortDate(volumeRows.at(-1)![0]) : "Awaiting data"}</strong></div>
        <div><span>Average daily volume</span><strong>{ready ? money(averageDailyVolume) : "—"}</strong></div>
        <div><span>Average daily swaps</span><strong>{ready ? compact(averageDailyTransactions) : "—"}</strong></div>
        <div><span>Last transaction observed</span><strong>{timestamp(meta.newest_transaction_timestamp)}</strong></div>
      </div>

      <div className="analytics-grid">
        <section className="chart-card">
          <div className="chart-top"><div><span className="mini-label">PUBLIC 1CLICK · USD</span><h3>Daily observed volume</h3><p>Successful Explorer transactions grouped by UTC date.</p></div><span className="chart-unit">USD <TrendingUp size={12}/></span></div>
          {volumeRows.length ? <div className="bars">{volumeRows.map(([day, value]) => <div className="bar-col" key={day} title={day + ": " + money(value)}><div className="bar-value">{compact(value, true)}</div><div className="bar" style={{ height: Math.max(5, value / maxVolume * 145) + "px" }}/><span>{shortDate(day)}</span></div>)}</div> : <div className="empty-chart"><BarChart3 size={24}/><strong>No published volume series</strong><span>Metrics appear after a verified refresh.</span></div>}
          <div className="chart-foot"><span><i/> Explorer · public swaps</span><span>Daily totals · UTC</span></div>
        </section>
        <section className="chart-card">
          <div className="chart-top"><div><span className="mini-label">TRANSACTION ACTIVITY</span><h3>Daily successful swaps</h3><p>Unique successful Explorer records per UTC day.</p></div><span className="chart-unit">SWAPS <Activity size={12}/></span></div>
          {txRows.length ? <div className="bars">{txRows.map(([day, value]) => <div className="bar-col" key={day} title={day + ": " + value.toLocaleString() + " swaps"}><div className="bar-value">{compact(value)}</div><div className="bar bar-alt" style={{ height: Math.max(5, value / maxTx * 145) + "px" }}/><span>{shortDate(day)}</span></div>)}</div> : <div className="empty-chart"><Activity size={24}/><strong>No published transaction series</strong><span>Metrics appear after a verified refresh.</span></div>}
          <div className="chart-foot"><span><i/> Explorer · SUCCESS only</span><span>Daily counts · UTC</span></div>
        </section>
      </div>

      <section className="signal-section">
        <div className="section-mini-head"><div><span className="mini-label">OBSERVED SIGNALS</span><h3>What the current sample says</h3></div><span className="quiet-pill">{coverageDays} UTC days</span></div>
        <div className="signal-grid">
          <article><span>Latest daily volume change</span><strong className={changeClass(dayChange)}>{pct(dayChange)}</strong><small>{latestVolume ? shortDate(latestVolume[0]) + " vs previous observed day" : "Not enough daily observations"}</small></article>
          <article><span>Latest swap-count change</span><strong className={changeClass(txChange)}>{pct(txChange)}</strong><small>{latestTx ? shortDate(latestTx[0]) + " vs previous observed day" : "Not enough daily observations"}</small></article>
          <article><span>Highest observed volume day</span><strong>{peakDay ? compact(peakDay[1], true) : "—"}</strong><small>{peakDay ? shortDate(peakDay[0]) : "Not available"}</small></article>
        </div>
      </section>

      <section className="provider-card">
        <div className="provider-head"><div><span className="mini-label">SECOND PROVIDER · CONTEXT ONLY</span><h3>DefiLlama DEX volume</h3><p>Separate provider series; not directly reconciled with public 1Click rows.</p></div><span className={llamaAvailable ? "status good" : "status pending"}><i/>{sourceStatus}</span></div>
        {llamaAvailable ? <><div className="provider-metrics"><strong>{compact(llamaRows.reduce((sum, [, value]) => sum + Number(value || 0), 0), true)}</strong><span>Sum of displayed DefiLlama daily points · not an Explorer-equivalent total</span></div><div className="bars provider-bars">{llamaRows.slice(-14).map(([day, value]) => <div className="bar-col" key={day} title={day + ": " + money(value)}><div className="bar-value">{compact(value, true)}</div><div className="bar bar-context" style={{ height: Math.max(5, value / maxLlama * 110) + "px" }}/><span>{shortDate(day)}</span></div>)}</div><p className="scope-note">{llamaMeta.comparison_note ?? "Provider context only; scope alignment has not been established."} <a href="https://docs.llama.fi/analysts/data-definitions" target="_blank" rel="noreferrer">DefiLlama methodology <ArrowUpRight size={12}/></a></p></> : <div className="provider-pending">DefiLlama data will appear here when its public endpoint returns a valid daily series. Explorer metrics continue independently.</div>}
      </section>

      <section className="quality-card">
        <div className="section-mini-head"><div><span className="mini-label">DATA QUALITY</span><h3>Coverage, freshness & integrity</h3></div><span className="quiet-pill">{thesisHorizon}</span></div>
        <div className="quality-grid">
          <div><span>Raw rows retained</span><strong>{meta.raw_rows != null ? Number(meta.raw_rows).toLocaleString() : "—"}</strong></div>
          <div><span>Unique records</span><strong>{meta.unique_rows != null ? Number(meta.unique_rows).toLocaleString() : "—"}</strong></div>
          <div><span>Duplicates removed</span><strong>{meta.duplicates_removed != null ? Number(meta.duplicates_removed).toLocaleString() : "—"}</strong></div>
          <div><span>Latest fetch pages</span><strong>{meta.latest_snapshot_pages != null ? Number(meta.latest_snapshot_pages).toLocaleString() : "—"} / {meta.configured_page_cap ?? "—"}</strong></div>
          <div><span>Last normalization</span><strong>{meta.generated_at_utc ? new Date(meta.generated_at_utc).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC" : "—"}</strong></div>
          <div><span>Pagination cap</span><strong className={capReached ? "warning-text" : "positive"}>{capReached ? "Reached" : "Not reached"}</strong></div>
        </div>
        <p className="scope-note"><ShieldCheck size={14}/>{meta.coverage_warning ?? "Coverage metadata is not yet available."}</p>
      </section>
    </section>

    <section className="research wrap" id="research">
      <div className="research-heading"><div><div className="eyebrow">INVESTMENT RESEARCH <span className="eyebrow-index">/ 02</span></div><h2>Signals, not speculation.</h2><p>Observations are generated from the published dataset. A short or capped sample is not a long-term investment thesis.</p></div></div>
      <div className="research-grid">
        <article><div className="research-icon"><BarChart3 size={18}/></div><span>01 / ACTIVITY BASELINE</span><h3>{ready ? money(averageDailyVolume) : "Awaiting data"}</h3><p>Average observed public 1Click volume per represented UTC day. It excludes activity outside the Explorer sample and should not be read as network-wide volume.</p></article>
        <article><div className="research-icon"><Activity size={18}/></div><span>02 / USAGE BASELINE</span><h3>{ready ? compact(averageDailyTransactions) + " swaps" : "Awaiting data"}</h3><p>Average successful transactions per represented UTC day. Transaction counts help distinguish larger individual swaps from broad activity growth.</p></article>
        <article><div className="research-icon"><Layers3 size={18}/></div><span>03 / TICKET SIZE</span><h3>{ready ? compact(averageTicket, true) : "Awaiting data"}</h3><p>Average USD notional per successful transaction. This is a sample average, not a median; large swaps can materially influence it.</p></article>
      </div>
      <div className="thesis-note"><div><span className="mini-label">CURRENT EVIDENCE ASSESSMENT</span><h3>{coverageDays >= 14 && !capReached ? "A broader sample is available for trend analysis." : "This is an early activity sample, not yet a durable trend."}</h3><p>{coverageDays} UTC dates are represented. {capReached ? "The latest collection reached its configured pagination cap, so older records may remain outside the snapshot." : "The latest collection did not hit its configured page cap, but full historical completeness still depends on provider pagination behavior."} Before drawing an investment conclusion, Deca still needs a longer consistent time series, verified independent source alignment, retention/cohort analysis, and fee/revenue economics.</p></div><span className="thesis-mark"><ShieldCheck size={25}/></span></div>
    </section>

    <section className="method wrap" id="methodology">
      <div className="method-intro"><div className="eyebrow">RESEARCH STANDARD <span className="eyebrow-index">/ 03</span></div><h2>Every claim<br/><span>needs evidence.</span></h2><p>Deca separates observed activity, provider context and investment interpretation. Missing data is never converted into zero or agreement.</p></div>
      <div className="method-grid">
        <article><div className="method-top"><span>01</span><Database size={19}/></div><h3>Collect</h3><p>Keep provider-native snapshots, documented pagination and SHA-256 manifests. Manual backfills support up to 500 pages.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Inspect pipeline <ArrowUpRight size={14}/></a></article>
        <article><div className="method-top"><span>02</span><Activity size={19}/></div><h3>Normalize</h3><p>De-duplicate repeated snapshots, apply SUCCESS filters and UTC boundaries, and publish coverage and freshness metadata.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">See definitions <ArrowUpRight size={14}/></a></article>
        <article><div className="method-top"><span>03</span><FileCheck2 size={19}/></div><h3>Reconcile</h3><p>Compare only like-for-like definitions. DefiLlama is shown as broader provider context until its scope aligns with Explorer.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Review evidence <ArrowUpRight size={14}/></a></article>
      </div>
    </section>
    <footer className="footer wrap"><a className="brand" href="#"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></a><span>Independent ecosystem intelligence · Evidence first.</span><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14}/></a></footer>
  </main>;
}

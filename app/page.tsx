import fs from "node:fs";
import path from "node:path";
import { Activity, ArrowUpRight, BarChart3, CheckCircle2, Clock3, Database, FileCheck2, GitBranch, ShieldCheck } from "lucide-react";

type MetricDoc = { metadata?: Record<string, any>; series?: Record<string, Record<string, number>> };
function readMetric(name: string): MetricDoc | null {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/metrics", name), "utf8")); }
  catch { return null; }
}
const volume = readMetric("intents_daily_volume_usd.json");
const txs = readMetric("daily_transactions.json");
function sumSeries(doc: MetricDoc | null) {
  const values = Object.values(doc?.series?.intents_explorer ?? {});
  return values.reduce((a, b) => a + Number(b || 0), 0);
}
function compact(n: number, currency = false) {
  if (!n) return "—";
  return currency ? "$" + new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n) :
    new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}
function dateRange(doc: MetricDoc | null) {
  const days = Object.keys(doc?.series?.intents_explorer ?? {}).sort();
  return days.length ? days[0] + " — " + days[days.length - 1] : "Awaiting verified data";
}
export default function Home() {
  const volumeTotal = sumSeries(volume);
  const txTotal = sumSeries(txs);
  const meta = volume?.metadata ?? txs?.metadata;
  const ready = Boolean(volume && txs && volumeTotal > 0 && txTotal > 0);
  const days = Object.entries(volume?.series?.intents_explorer ?? {}).sort(([a],[b]) => a.localeCompare(b));
  const max = Math.max(1, ...days.map(([,v]) => v));
  return <main>
    <nav className="nav wrap"><a className="brand" href="#"><span className="brand-mark">D</span><span>deca<span className="brand-dot">.</span></span></a><div className="nav-links"><a href="#dashboard">Dashboard</a><a href="#methodology">Methodology</a><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14}/></a></div><span className="live"><i/> Evidence-first analytics</span></nav>
    <section className="hero wrap">
      <div className="eyebrow"><span className="eyebrow-line"/> NEAR ECOSYSTEM DATA, RECONCILED</div>
      <h1>Numbers are easy.<br/><em>Trust is the work.</em></h1>
      <p className="hero-copy">Deca independently tracks, normalizes and compares NEAR ecosystem metrics. Every number should have a source, a definition, a time window and evidence you can inspect.</p>
      <div className="hero-actions"><a className="primary" href="#dashboard">Explore the evidence <ArrowUpRight size={16}/></a><a className="secondary" href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Inspect the methodology <GitBranch size={15}/></a></div>
      <div className="hero-foot"><span><ShieldCheck size={15}/> Reproducible by design</span><span><Database size={15}/> Source-aware metrics</span><span><FileCheck2 size={15}/> Auditable snapshots</span></div>
    </section>
    <section className="dashboard wrap" id="dashboard">
      <div className="section-head"><div><div className="eyebrow">01 / LIVE EVIDENCE</div><h2>NEAR Intents overview</h2><p>Public 1Click Explorer transactions. Not a claim of total network-wide Intents volume.</p></div><span className={ready ? "status good" : "status pending"}><i/>{ready ? "Metrics loaded" : "Awaiting published snapshot"}</span></div>
      <div className="stats">
        <article className="stat"><div className="stat-label">Observed successful volume <BarChart3 size={16}/></div><strong>{ready ? compact(volumeTotal, true) : "—"}</strong><small>USD · Explorer amountInUsd</small></article>
        <article className="stat"><div className="stat-label">Successful transactions <Activity size={16}/></div><strong>{ready ? compact(txTotal) : "—"}</strong><small>SUCCESS status only</small></article>
        <article className="stat"><div className="stat-label">Date coverage <Clock3 size={16}/></div><strong className="coverage">{ready ? Object.keys(volume?.series?.intents_explorer ?? {}).length + " days" : "—"}</strong><small>{dateRange(volume)}</small></article>
      </div>
      <div className="chart-card"><div className="chart-top"><div><h3>Daily observed volume</h3><p>UTC · Successful public 1Click transactions</p></div><span className="chart-unit">USD</span></div>
        {days.length ? <div className="bars">{days.map(([day,value])=><div className="bar-col" key={day} title={day + ": $" + value.toLocaleString()}><div className="bar-value">{compact(value,true)}</div><div className="bar" style={{height: Math.max(5, value/max*150) + "px"}}/><span>{day.slice(5)}</span></div>)}</div> : <div className="empty-chart"><div className="empty-icon"><BarChart3 size={22}/></div><strong>Evidence is being prepared</strong><span>The dashboard will populate automatically when a verified snapshot is published from GitHub Actions.</span></div>}
      </div>
      <div className="notice"><ShieldCheck size={18}/><div><strong>Scope matters</strong><span>This feed covers public 1Click swap transactions returned by the Explorer API. It excludes activity not represented in that endpoint. A capped page run is a sample, not complete historical coverage.</span></div></div>
    </section>
    <section className="method wrap" id="methodology"><div className="eyebrow">02 / HOW TO READ DECA</div><h2>Evidence before conclusions.</h2><div className="method-grid">
      <article><span>01</span><h3>Collect</h3><p>Fetch provider-native records with documented pagination and rate limits. Preserve raw snapshots and SHA-256 manifests.</p></article>
      <article><span>02</span><h3>Normalize</h3><p>Apply explicit status filters, UTC date boundaries, units and versioned adapters. Never silently fill missing values.</p></article>
      <article><span>03</span><h3>Reconcile</h3><p>Compare only metrics with matching definitions and overlapping dates. Report gaps, missing sources and limitations.</p></article>
    </div></section>
    <footer className="footer wrap"><a className="brand" href="#"><span className="brand-mark">D</span><span>deca<span className="brand-dot">.</span></span></a><span>Built around evidence, not vanity metrics.</span><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14}/></a></footer>
  </main>;
}

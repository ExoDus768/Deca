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
  return Object.values(doc?.series?.intents_explorer ?? {}).reduce((a, b) => a + Number(b || 0), 0);
}
function compact(n: number, currency = false) {
  if (!n) return "—";
  const value = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  return currency ? "$" + value : value;
}
function dateRange(doc: MetricDoc | null) {
  const days = Object.keys(doc?.series?.intents_explorer ?? {}).sort();
  return days.length ? days[0] + " — " + days[days.length - 1] : "Awaiting verified data";
}
export default function Home() {
  const volumeTotal = sumSeries(volume);
  const txTotal = sumSeries(txs);
  const ready = Boolean(volume && txs && volumeTotal > 0 && txTotal > 0);
  const days = Object.entries(volume?.series?.intents_explorer ?? {}).sort(([a],[b]) => a.localeCompare(b));
  const max = Math.max(1, ...days.map(([,v]) => v));
  return <main>
    <nav className="nav wrap">
      <a className="brand" href="#"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></a>
      <div className="nav-links"><a href="#dashboard">Dashboard</a><a href="#methodology">Methodology</a><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Documentation <ArrowUpRight size={14}/></a></div>
      <a className="nav-cta" href="https://github.com/ExoDus768/Deca/actions/workflows/explorer-refresh.yml" target="_blank" rel="noreferrer">Refresh data <ArrowUpRight size={14}/></a>
    </nav>

    <section className="dashboard wrap" id="dashboard">
      <div className="section-head"><div><div className="eyebrow">DASHBOARD <span className="eyebrow-index">/ OVERVIEW</span></div><h2>NEAR Intents overview</h2><p>A transparent view of public 1Click Explorer activity.</p></div><span className={ready ? "status good" : "status pending"}><i/>{ready ? "Snapshot available" : "Waiting for snapshot"}</span></div>
      <div className="stats">
        <article className="stat stat-primary"><div className="stat-label">Observed successful volume <BarChart3 size={17}/></div><strong>{ready ? compact(volumeTotal, true) : "—"}</strong><small>USD · Explorer amountInUsd</small><span className="stat-index">01</span></article>
        <article className="stat"><div className="stat-label">Successful transactions <Activity size={17}/></div><strong>{ready ? compact(txTotal) : "—"}</strong><small>SUCCESS status only</small><span className="stat-index">02</span></article>
        <article className="stat"><div className="stat-label">Date coverage <Clock3 size={17}/></div><strong className="coverage">{ready ? Object.keys(volume?.series?.intents_explorer ?? {}).length + " days" : "—"}</strong><small>{dateRange(volume)}</small><span className="stat-index">03</span></article>
      </div>
      <div className="chart-card">
        <div className="chart-top"><div><span className="mini-label">ACTIVITY OVER TIME</span><h3>Daily observed volume</h3><p>Successful public 1Click transactions · UTC</p></div><span className="chart-unit">USD <span>↗</span></span></div>
        {days.length ? <div className="bars">{days.map(([day,value])=><div className="bar-col" key={day} title={day + ": $" + value.toLocaleString()}><div className="bar-value">{compact(value,true)}</div><div className="bar" style={{height: Math.max(5, value/max*150) + "px"}}/><span>{day.slice(5)}</span></div>)}</div> : <div className="empty-chart"><div className="empty-icon"><BarChart3 size={23}/></div><strong>Your evidence dashboard is getting ready.</strong><span>Published metrics will appear here automatically after a verified GitHub Actions snapshot.</span></div>}
        <div className="chart-foot"><span><i/> Explorer source</span><span>Daily totals · USD</span></div>
      </div>
      <div className="notice"><div className="notice-icon"><ShieldCheck size={20}/></div><div><strong>Read the scope before the headline.</strong><span>This feed covers public 1Click swap transactions returned by the Explorer API. It does not represent total network-wide NEAR Intents volume. Capped page runs are samples, not complete historical coverage.</span></div><a href="#methodology">Our methodology <ArrowUpRight size={14}/></a></div>
    </section>

    <section className="method wrap" id="methodology">
      <div className="method-intro"><div className="eyebrow">BUILT FOR CLARITY <span className="eyebrow-index">/ 02</span></div><h2>Evidence is the<br/><span>starting point.</span></h2><p>Good analysis is more than a chart. Every metric needs a traceable source, a consistent definition, and an honest account of its limits.</p></div>
      <div className="method-grid">
        <article><div className="method-top"><span>01</span><Database size={19}/></div><h3>Collect</h3><p>Fetch provider-native records with documented pagination and rate limits. Preserve raw snapshots and SHA-256 manifests.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Explore the data pipeline <ArrowUpRight size={14}/></a></article>
        <article><div className="method-top"><span>02</span><Activity size={19}/></div><h3>Normalize</h3><p>Apply explicit status filters, UTC date boundaries, units and versioned adapters. Never silently fill missing values.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">See the definitions <ArrowUpRight size={14}/></a></article>
        <article><div className="method-top"><span>03</span><FileCheck2 size={19}/></div><h3>Reconcile</h3><p>Compare only metrics with matching definitions and overlapping dates. Report gaps, missing sources and limitations.</p><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Review the evidence <ArrowUpRight size={14}/></a></article>
      </div>
    </section>
    <footer className="footer wrap"><a className="brand" href="#"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></a><span>Independent ecosystem intelligence.</span><a href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer">Open source <ArrowUpRight size={14}/></a></footer>
  </main>;
}

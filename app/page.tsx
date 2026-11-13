import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, CheckCircle2, Layers3, ShieldCheck, TrendingUp } from "lucide-react";
import SiteNav from "./components/site-nav";
import RefreshButton from "./refresh-button";

type MetricDoc = { metadata?: Record<string, any>; series?: Record<string, Record<string, number>> };
function readJson(file: string): MetricDoc | null { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")); } catch { return null; } }
const volumeDoc = readJson("data/metrics/intents_daily_volume_usd.json");
const txDoc = readJson("data/metrics/daily_transactions.json");
const volume = volumeDoc?.series?.intents_explorer ?? {};
const tx = txDoc?.series?.intents_explorer ?? {};
const volumeRows = Object.entries(volume).sort(([a],[b])=>a.localeCompare(b));
const txRows = Object.entries(tx).sort(([a],[b])=>a.localeCompare(b));
const totalVolume = volumeRows.reduce((s,[,v])=>s+Number(v||0),0);
const totalTx = txRows.reduce((s,[,v])=>s+Number(v||0),0);
const average = totalTx ? totalVolume/totalTx : 0;
const meta = volumeDoc?.metadata ?? {};
const fmt = (n:number, currency=false) => (currency?"$":"")+new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:2}).format(n);
const day = (s:string) => new Date(s+"T00:00:00Z").toLocaleDateString("en",{month:"short",day:"numeric",timeZone:"UTC"});
export default function Home(){
 const ok=totalVolume>0&&totalTx>0;
 return <main><SiteNav/><section className="overview wrap">
  <div className="overview-top"><div><div className="eyebrow"><i className="eyebrow-dot"/> ECOSYSTEM INTELLIGENCE <span className="eyebrow-index">/ OVERVIEW</span></div><h1>NEAR Intents,<br/><span>in focus.</span></h1><p>A clear starting point for understanding activity, adoption signals and the quality of the underlying evidence.</p></div><div className="overview-actions"><span className={ok?"status good":"status pending"}><i/>{ok?"Metrics published":"Awaiting verified data"}</span><RefreshButton/></div></div>
  <div className="overview-grid">
   <article className="overview-primary"><div className="stat-label">OBSERVED SUCCESSFUL VOLUME <BarChart3 size={17}/></div><strong>{ok?fmt(totalVolume,true):"—"}</strong><small>USD · public 1Click Explorer sample</small><div className="overview-card-foot"><span>Across {volumeRows.length} UTC dates</span><TrendingUp size={17}/></div></article>
   <article className="overview-stat"><div className="stat-label">SUCCESSFUL SWAPS <Activity size={17}/></div><strong>{ok?fmt(totalTx):"—"}</strong><small>Unique successful Explorer records</small></article>
   <article className="overview-stat"><div className="stat-label">AVERAGE SWAP SIZE <Layers3 size={17}/></div><strong>{ok?fmt(average,true):"—"}</strong><small>Observed volume ÷ successful swaps</small></article>
  </div>
  <div className="overview-lower">
   <section className="overview-panel"><div className="panel-heading"><div><span className="mini-label">RECENT ACTIVITY</span><h2>Volume snapshot</h2></div><Link href="/analytics">Open analytics <ArrowRight size={14}/></Link></div>
    {volumeRows.length?<div className="mini-bars">{volumeRows.slice(-7).map(([date,value])=><div className="mini-bar-col" key={date}><span>{fmt(value,true)}</span><i style={{height:Math.max(5,value/Math.max(...volumeRows.slice(-7).map(([,v])=>v))*88)+"px"}}/><small>{day(date)}</small></div>)}</div>:<div className="overview-empty">Daily metrics will appear after a verified refresh.</div>}
   </section>
   <section className="overview-panel evidence-panel"><div className="panel-heading"><div><span className="mini-label">EVIDENCE STATUS</span><h2>What to know</h2></div><ShieldCheck size={19}/></div>
    <div className="evidence-row"><span>Data source</span><strong>Public 1Click Explorer</strong></div><div className="evidence-row"><span>Latest observed date</span><strong>{volumeRows.length?day(volumeRows.at(-1)![0]):"—"}</strong></div><div className="evidence-row"><span>Pagination cap</span><strong className={meta.page_cap_reached?"warning-text":"positive"}>{meta.page_cap_reached?"Reached":"Not reached"}</strong></div>
    <p>These figures describe the available Explorer sample, not total NEAR Intents network activity.</p>
   </section>
  </div>
  <div className="overview-links"><Link href="/analytics"><span className="quick-icon"><BarChart3 size={18}/></span><span><strong>Explore analytics</strong><small>Choose date ranges, metrics and compare periods</small></span><ArrowRight size={17}/></Link><Link href="/investment"><span className="quick-icon"><TrendingUp size={18}/></span><span><strong>Investment signals</strong><small>Adoption, activity quality and risk indicators</small></span><ArrowRight size={17}/></Link><Link href="/methodology"><span className="quick-icon"><CheckCircle2 size={18}/></span><span><strong>Methodology</strong><small>Understand how every number is calculated</small></span><ArrowRight size={17}/></Link></div>
 </section><footer className="footer wrap"><Link className="brand" href="/"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></Link><span>Independent ecosystem intelligence · Evidence first.</span><span>Data scope: public 1Click</span></footer></main>
}

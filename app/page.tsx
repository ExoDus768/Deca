import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Activity, ArrowRight, BarChart3, CheckCircle2, Layers3, ShieldCheck, TrendingUp, GitCompareArrows, Database, Clock3 } from "lucide-react";
import SiteNav from "./components/site-nav";
import RefreshButton from "./refresh-button";

type Doc = { metadata?: Record<string, any>; series?: Record<string, Record<string, number>>; pairs?: Array<{pair:string;volume_usd:number;successful_transactions:number}> };
function readJson(file: string): any { try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8")); } catch { return null; } }
const volumeDoc:Doc|null=readJson("data/metrics/intents_daily_volume_usd.json");
const txDoc:Doc|null=readJson("data/metrics/daily_transactions.json");
const pairDoc:Doc|null=readJson("data/metrics/asset_pair_breakdown.json");
const reconciliation=readJson("published/reconciliation.json");
const volume=volumeDoc?.series?.intents_explorer??{},tx=txDoc?.series?.intents_explorer??{};
const volumeRows=Object.entries(volume).sort(([a],[b])=>a.localeCompare(b));
const totalVolume=volumeRows.reduce((s,[,v])=>s+Number(v||0),0);
const totalTx=Object.values(tx).reduce((s,v)=>s+Number(v||0),0);
const average=totalTx?totalVolume/totalTx:0;
const meta=volumeDoc?.metadata??{};
const provider=reconciliation?.provider_context?.defillama_intents??{};
const diagnostic=provider.diagnostic_comparison??{};
const pairs=pairDoc?.pairs??[];
const topPair=pairs[0];
const topPairShare=topPair&&totalVolume?topPair.volume_usd/totalVolume*100:0;
const fmt=(n:number,currency=false)=>(currency?"$":"")+new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:2}).format(n);
const exact=(n:number)=>new Intl.NumberFormat("en",{maximumFractionDigits:2}).format(n);
const day=(s:string)=>new Date(s+"T00:00:00Z").toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
const asset=(id:string)=>{const raw=id.split(":").pop()??id;return raw.split("-")[0].replace(".omft.near","").replace(".near","");};
export default function Home(){
 const ok=totalVolume>0&&totalTx>0;
 const latest=volumeRows.at(-1)?.[0];
 const compareReady=diagnostic.status==="compared";
 return <main><SiteNav/><section className="overview wrap">
  <div className="overview-top"><div><div className="eyebrow"><i className="eyebrow-dot"/> ECOSYSTEM INTELLIGENCE <span className="eyebrow-index">/ OVERVIEW</span></div><h1>NEAR Intents,<br/><span>in focus.</span></h1><p>A concise view of ecosystem activity, cross-provider evidence and the quality of the underlying data.</p></div><div className="overview-actions"><span className={ok?"status good":"status pending"}><i/>{ok?"Metrics published":"Awaiting verified data"}</span><RefreshButton/></div></div>
  <div className="overview-grid">
   <article className="overview-primary"><div className="stat-label">OBSERVED SUCCESSFUL VOLUME <BarChart3 size={17}/></div><strong>{ok?fmt(totalVolume,true):"—"}</strong><small>USD · public 1Click Explorer sample · not network-wide volume</small><div className="overview-card-foot"><span>{volumeRows.length} retained UTC dates</span><TrendingUp size={17}/></div></article>
   <article className="overview-stat"><div className="stat-label">SUCCESSFUL SWAPS <Activity size={17}/></div><strong>{ok?fmt(totalTx):"—"}</strong><small>Unique successful Explorer records</small></article>
   <article className="overview-stat"><div className="stat-label">AVERAGE SWAP SIZE <Layers3 size={17}/></div><strong>{ok?fmt(average,true):"—"}</strong><small>Observed volume ÷ successful swaps</small></article>
  </div>
  <div className="overview-lower">
   <section className="overview-panel"><div className="panel-heading"><div><span className="mini-label">RECENT ACTIVITY</span><h2>Volume snapshot</h2></div><Link href="/analytics">Open analytics <ArrowRight size={14}/></Link></div>
    {volumeRows.length?<div className="mini-bars">{volumeRows.slice(-7).map(([date,value])=><div className="mini-bar-col" key={date}><span>{fmt(value,true)}</span><i style={{height:Math.max(5,value/Math.max(...volumeRows.slice(-7).map(([,v])=>v))*88)+"px"}}/><small>{day(date)}</small></div>)}</div>:<div className="overview-empty">Daily metrics will appear after a verified refresh.</div>}
   </section>
   <section className="overview-panel evidence-panel"><div className="panel-heading"><div><span className="mini-label">EVIDENCE STATUS</span><h2>Collection integrity</h2></div><ShieldCheck size={19}/></div>
    <div className="evidence-row"><span>Success rate</span><strong>{meta.success_rate_pct!=null?exact(meta.success_rate_pct)+"%":"Unavailable"}</strong></div>
    <div className="evidence-row"><span>Unique / raw records</span><strong>{meta.unique_rows!=null?fmt(meta.unique_rows)+" / "+fmt(meta.raw_rows):"Unavailable"}</strong></div>
    <div className="evidence-row"><span>Duplicates removed</span><strong>{meta.duplicates_removed!=null?fmt(meta.duplicates_removed):"Unavailable"}</strong></div>
    <div className="evidence-row"><span>Latest fetch pages</span><strong>{meta.latest_snapshot_pages!=null?meta.latest_snapshot_pages+" / "+meta.configured_page_cap:"Unavailable"}</strong></div>
    <div className="evidence-row"><span>Last normalization</span><strong>{meta.generated_at_utc?new Date(meta.generated_at_utc).toLocaleString("en",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"})+" UTC":"Unavailable"}</strong></div>
    <div className="evidence-row"><span>Page cap reached</span><strong className={meta.page_cap_reached?"warning-text":"positive"}>{meta.page_cap_reached?"Yes":"No"}</strong></div>
    <p>Counts describe the retained snapshot collection. Page-cap status is not proof of complete historical coverage.</p>
   </section>
  </div>
  <section className="provider-card"><div className="provider-head"><div><span className="mini-label">CROSS-SOURCE CHECK · DAILY USD VOLUME</span><h3>Explorer vs DefiLlama</h3><p>Independent provider context compared on overlapping UTC dates.</p></div><span className="quiet-pill">{compareReady?"DIAGNOSTIC COMPARISON":provider.status==="available"?"PROVIDER AVAILABLE":"PROVIDER PENDING"}</span></div>
   {compareReady?<><div className="provider-kpis"><div><span>Overlapping days</span><strong>{diagnostic.overlap_days}</strong></div><div><span>Median absolute gap</span><strong>{diagnostic.median_gap_pct}%</strong></div><div><span>Maximum daily gap</span><strong>{diagnostic.max_gap_pct}%</strong></div><div><span>Latest shared date</span><strong>{provider.latest_overlap_day}</strong></div></div><div className="provider-latest"><span>Latest shared date values</span><strong>Explorer {fmt(provider.latest_explorer_usd,true)}</strong><strong>DefiLlama {fmt(provider.latest_defillama_usd,true)}</strong></div></>:<div className="provider-pending">{provider.note??"A second provider snapshot has not yet been normalized. The next scheduled refresh will attempt to collect it."}</div>}
   <p className="scope-note"><GitCompareArrows size={14}/> {provider.note??"DefiLlama and Explorer may cover different transaction populations."} This is a scope-mismatched diagnostic, not a formal like-for-like reconciliation.</p>
  </section>
  <section className="quality-card"><div className="provider-head"><div><span className="mini-label">ACTIVITY COMPOSITION</span><h3>Most active asset pairs</h3><p>Ranked by observed successful USD input value from Explorer records.</p></div><Link href="/analytics">Explore full analytics <ArrowRight size={14}/></Link></div>
   {pairs.length?<><div className="pair-table"><div className="pair-row pair-header"><span>ASSET PAIR</span><span>SUCCESSFUL SWAPS</span><span>OBSERVED VOLUME</span><span>SHARE</span></div>{pairs.slice(0,5).map((p,i)=><div className="pair-row" key={p.pair}><span><b>{asset(p.pair.split(" → ")[0])} → {asset(p.pair.split(" → ")[1])}</b><small>{p.pair}</small></span><span>{p.successful_transactions.toLocaleString("en")}</span><span>{fmt(p.volume_usd,true)}</span><span>{totalVolume?(p.volume_usd/totalVolume*100).toFixed(1)+"%":"—"}</span></div>)}</div><div className="pair-insight">Top observed pair represents {topPairShare.toFixed(1)}% of the retained Explorer volume. This is a concentration indicator, not a quality-adjusted volume estimate.</div></>:<div className="provider-pending">Asset-pair composition will appear after the next Explorer normalization.</div>}
  </section>
  <div className="overview-links"><Link href="/analytics"><span className="quick-icon"><BarChart3 size={18}/></span><span><strong>Explore analytics</strong><small>Choose date ranges, metrics and compare periods</small></span><ArrowRight size={17}/></Link><Link href="/investment"><span className="quick-icon"><TrendingUp size={18}/></span><span><strong>Investment signals</strong><small>Adoption, activity quality and risk factors</small></span><ArrowRight size={17}/></Link><Link href="/methodology"><span className="quick-icon"><CheckCircle2 size={18}/></span><span><strong>Methodology</strong><small>Definitions, source scope and data quality</small></span><ArrowRight size={17}/></Link></div>
 </section><footer className="footer wrap"><Link className="brand" href="/"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></Link><span>Independent ecosystem intelligence · Evidence first.</span><span>Data scope: public 1Click</span></footer></main>
}

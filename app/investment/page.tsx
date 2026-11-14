import fs from "node:fs";
import path from "node:path";
import volumeDoc from "../../data/metrics/intents_daily_volume_usd.json";
import txDoc from "../../data/metrics/daily_transactions.json";
import qualityDoc from "../../data/metrics/daily_quality.json";
import Link from "next/link";
import SiteNav from "../components/site-nav";
import { Activity, ArrowUpRight, CircleAlert, Coins, GitCompareArrows, Terminal } from "lucide-react";

function read(file:string):any {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(),file),"utf8")); }
  catch { return null; }
}
const feesDoc=read("data/metrics/defillama_fees_revenue.json");
const defiVolumeDoc=read("data/metrics/defillama_daily_volume_usd.json");
const reconciliation=read("published/reconciliation.json");
const volume=(volumeDoc as any)?.series?.intents_explorer??{};
const tx=(txDoc as any)?.series?.intents_explorer??{};
const dailyQuality=(qualityDoc as any)?.series?.intents_explorer??{};
const dailyDates=Object.keys(volume).filter(d=>tx[d]!=null).sort();
const latestFiveDates=dailyDates.slice(-5);
const latestFive=latestFiveDates.map(date=>({date,volume:Number(volume[date]??0),transactions:Number(tx[date]??0),successRate:dailyQuality[date]?.success_rate_pct==null?null:Number(dailyQuality[date].success_rate_pct)}));
const fiveDayTotal=latestFive.reduce((sum,r)=>sum+r.volume,0);
const fiveDayAverage=latestFive.length?fiveDayTotal/latestFive.length:0;
const fiveDayMin=latestFive.length?Math.min(...latestFive.map(r=>r.volume)):0;
const fiveDayMax=latestFive.length?Math.max(...latestFive.map(r=>r.volume)):0;
const fiveDayRates=latestFive.map(r=>r.successRate).filter((v):v is number=>v!=null);
const fiveDayRateMin=fiveDayRates.length?Math.min(...fiveDayRates):null;
const fiveDayRateMax=fiveDayRates.length?Math.max(...fiveDayRates):null;
const fiveDayAvgSwap=latestFive.reduce((sum,r)=>sum+r.transactions,0)?fiveDayTotal/latestFive.reduce((sum,r)=>sum+r.transactions,0):0;
const defiVolume=defiVolumeDoc?.series?.defillama_intents??{};
const dates=Object.keys(volume).sort();
const defiVolumeDates=Object.keys(defiVolume).sort();
const totalVolume=Object.values(volume).reduce((a:number,b:any)=>a+Number(b||0),0);
const totalTx=Object.values(tx).reduce((a:number,b:any)=>a+Number(b||0),0);
const meta=(volumeDoc as any)?.metadata??{};
const qualityRate=meta.success_rate_pct!=null?Number(meta.success_rate_pct):(meta.successful_rows!=null&&meta.raw_rows?Number(meta.successful_rows)/Number(meta.raw_rows)*100:null);
const rateBasis="daily unique Explorer records; see five-day sample below";
const fmt=(n:number)=>new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:2}).format(n);
const money=(n:number)=>"$"+fmt(n);
function recentTotal(series:Record<string,number>){
 const days=Object.keys(series??{}).sort();
 if(!days.length)return null;
 const end=new Date(days[days.length-1]+"T00:00:00Z");
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-29);
 return Object.entries(series).filter(([d])=>d>=start.toISOString().slice(0,10)&&d<=days[days.length-1]).reduce((s,[,v])=>s+Number(v||0),0);
}
function windowTotal(series:Record<string,number>,windowDays:number){
 const days=Object.keys(series??{}).sort();
 if(!days.length)return null;
 const end=new Date(days[days.length-1]+"T00:00:00Z");
 const start=new Date(end);start.setUTCDate(start.getUTCDate()-(windowDays-1));
 return Object.entries(series).filter(([d])=>d>=start.toISOString().slice(0,10)&&d<=days[days.length-1]).reduce((s,[,v])=>s+Number(v||0),0);
}
const fees=feesDoc?.series?.defillama_intents_fees??{};
const revenue=feesDoc?.series?.defillama_intents_revenue??{};
const protocolRevenue=feesDoc?.series?.defillama_intents_protocol_revenue??{};
const holderRevenue=feesDoc?.series?.defillama_intents_holders_revenue??{};
const supplySideRevenue=feesDoc?.series?.defillama_intents_supply_side_revenue??{};
const defiVolume90=windowTotal(defiVolume,90);
const defiVolume365=windowTotal(defiVolume,365);
const defiVolumeCoverage=defiVolumeDates.length ? `${defiVolumeDates.length} daily observations · ${defiVolumeDates[0]} to ${defiVolumeDates[defiVolumeDates.length-1]}` : "DefiLlama DEX volume history pending";
const fees30=recentTotal(fees);
const revenue30=recentTotal(revenue);
const protocolRevenue30=recentTotal(protocolRevenue);
const holderRevenue30=recentTotal(holderRevenue);
const supplySideRevenue30=recentTotal(supplySideRevenue);
const monetization=fees30&&revenue30!=null?revenue30/fees30*100:null;
const holderCapture=fees30&&holderRevenue30!=null?holderRevenue30/fees30*100:null;
const feeDates=Object.keys(fees).sort();
const feeCoverage=feeDates.length ? `${feeDates.length} daily fee observations · ${feeDates[0]} to ${feeDates[feeDates.length-1]}` : "Long-run fee history pending refresh";
const provider=reconciliation?.provider_context?.defillama_intents??{};
const diagnostic=provider.diagnostic_comparison??{};
const latestPair=provider.latest_overlap_day&&provider.latest_explorer_usd!=null&&provider.latest_defillama_usd!=null
 ? `Latest shared day ${provider.latest_overlap_day}: Explorer ${money(Number(provider.latest_explorer_usd))} vs DefiLlama ${money(Number(provider.latest_defillama_usd))}.`
 : "Latest paired daily values will appear after the provider refresh.";
const thesisTriggers=[
 ["Adoption persists","DefiLlama NEAR Intents DEX volume rises across successive 90-day windows for two consecutive quarters, with public Explorer swap counts confirming direction where overlap exists.","Use the longer provider history for the trend; keep the public 1Click count as a narrower cross-check, not a substitute for all-Intents activity."],
 ["Usage converts to economics","NEAR Intents captured revenue remains at least 25% of gross fees over two consecutive quarters, with solver/distribution shares disclosed.","This is a proposed Deca test. Captured revenue is not identical to token-holder revenue."],
 ["The evidence survives cross-checks","Explorer and DefiLlama NEAR Intents daily volume show a stable, explainable gap over 30+ overlapping days.","Explorer is public 1Click only; DefiLlama DEX volume may include a broader integrator set. The volume gap remains diagnostic until scope is aligned."]
];
export default function Investment(){
 const enoughHistory=dates.length>=90&&!meta.page_cap_reached;
 const sampleSuccess=fiveDayRateMin==null||fiveDayRateMax==null?"Not published":fiveDayRateMin.toFixed(2)+"% – "+fiveDayRateMax.toFixed(2)+"%";
 return <main><SiteNav/><section className="research-page wrap">
  <div className="page-intro"><div><div className="eyebrow"><i className="eyebrow-dot"/> INVESTMENT THESIS <span className="eyebrow-index">/ 02</span></div><h1>Make the case.<br/><span>Test the evidence.</span></h1><p>A provisional long-term view of NEAR, with measurable conditions that would strengthen or break it. Not financial advice.</p></div></div>
  <section className="thesis-statement">
   <div className="thesis-statement-head"><span className="mini-label">THE PROVISIONAL THESIS</span><span className="thesis-grade">HYPOTHESIS · NOT A BUY RATING</span></div>
   <h2>NEAR can become a durable cross-chain execution and distribution layer — if Intents usage compounds and that activity converts into protocol economics.</h2>
   <p>The opportunity is that users can move value across chains through a unified intent-based experience, while NEAR's ecosystem captures economic value from the activity. The evidence today supports investigating that model; it does not yet prove durable adoption, competitive advantage, or value accruing to the NEAR token.</p>
   <div className="thesis-verdict"><strong>What would change our mind?</strong><span>Persistent activity growth and sustained fee-to-revenue conversion strengthen the case. Falling Intents usage, weakening monetization, or no credible token value capture weaken it.</span></div>
  </section>
  <section className="thesis-snapshot">
   <div className="thesis-statement-head"><span className="mini-label">LATEST PUBLISHED FIVE-DAY SAMPLE</span><span className="thesis-grade">{latestFiveDates[0]??"—"} → {latestFiveDates.at(-1)??"—"} · UTC</span></div>
   <h2>Recent public 1Click activity is meaningful in scale, but the sample is still too short to establish a durable trend.</h2>
   <p>Across the latest five published days, Nov 9–13, 2026, the Explorer sample recorded {money(fiveDayTotal)} in successful swap volume, averaging {money(fiveDayAverage)} per day. Daily volume ranged from {money(fiveDayMin)} to {money(fiveDayMax)}. The observed daily success rate ranged from {fiveDayRateMin==null?"—":fiveDayRateMin.toFixed(2)+"%"} to {fiveDayRateMax==null?"—":fiveDayRateMax.toFixed(2)+"%"}, while the weighted average successful swap was {money(fiveDayAvgSwap)}.</p>
   <p>These figures describe public 1Click swaps returned by the Explorer API, not every NEAR Intents integration. They show recent usage, not proof of retention, organic growth, defensibility, or token value capture. The short window and Explorer page cap make a longer, independently reconciled history necessary before upgrading conviction.</p>
   <div className="thesis-snapshot-grid"><div><span>DAILY VOLUME RANGE</span><strong>{money(fiveDayMin)} – {money(fiveDayMax)}</strong></div><div><span>DAILY SUCCESS RATE</span><strong>{fiveDayRateMin==null?"—":fiveDayRateMin.toFixed(2)+"%"} – {fiveDayRateMax==null?"—":fiveDayRateMax.toFixed(2)+"%"}</strong></div><div><span>WEIGHTED AVG. SWAP</span><strong>{money(fiveDayAvgSwap)}</strong></div></div>
  </section>
  <div className="thesis-status"><span className="mini-label">EVIDENCE GRADE</span><strong>{enoughHistory?"Developing · broader history available":"Early · insufficient for a long-term conclusion"}</strong><p>{dates.length} UTC daily Explorer observations currently published. {meta.page_cap_reached?"The latest Explorer fetch reached its configured page cap, so history may be incomplete.":"The Explorer sample is not yet a verified long-term history."} DefiLlama DEX context: {defiVolumeCoverage}. Its scope may be broader than public 1Click. The dedicated Intents fee adapter supplies a separate long-run economics series.</p></div>
  <h2 className="subsection-title">The three measurable pillars</h2>
  <div className="thesis-evidence-grid">
   <article><div className="research-icon"><Activity size={18}/></div><span>01 · INTENTS USAGE</span><h3>{money(totalVolume)}</h3><p>{fmt(totalTx)} successful public 1Click swaps across {dates.length} retained UTC dates. This is observed Explorer sample volume, not all NEAR Intents activity.</p><small>{dates.length>=90?"90+ Explorer daily observations":"Short Explorer sample — trend not established"}</small><small>{defiVolume90==null?"DefiLlama 90-day volume pending":money(defiVolume90)+" DefiLlama DEX volume · trailing 90d"}</small><small>{defiVolume365==null?"DefiLlama 365-day volume pending":money(defiVolume365)+" DefiLlama DEX volume · trailing 365d"}</small></article>
   <article><div className="research-icon"><Coins size={18}/></div><span>02 · PROTOCOL ECONOMICS</span><h3>{fees30==null?"Awaiting fee feed":money(fees30)}</h3><p>{fees30==null?"DefiLlama fee history has not yet been normalized.":"Trailing 30-day gross NEAR Intents fees across integrators. Captured revenue and holder buybacks are separate series."}</p><small>{revenue30==null?"Captured revenue pending":money(revenue30)+" captured · "+(monetization==null?"":monetization.toFixed(1)+"% of fees")}</small><small>{holderRevenue30==null?"Holder buybacks pending":money(holderRevenue30)+" holder buybacks"} · {protocolRevenue30==null?"Treasury series pending":money(protocolRevenue30)+" treasury"} · {supplySideRevenue30==null?"Solver share pending":money(supplySideRevenue30)+" solver/distribution share"}</small><small>{feeCoverage}</small></article>
   <article><div className="research-icon"><GitCompareArrows size={18}/></div><span>03 · SOURCE CROSS-CHECK</span><h3>{diagnostic.status==="compared"?diagnostic.median_gap_pct+"%":"Not yet comparable"}</h3><p>{diagnostic.status==="compared"?"Median absolute daily gap between Explorer and DefiLlama Intents volume over shared dates. This is diagnostic only, not formal reconciliation.":"A provider series and overlapping dates are still required before a gap can be calculated."}</p><small>{latestPair}</small><small>{diagnostic.status==="compared"?diagnostic.overlap_days+" overlapping days · maximum gap "+diagnostic.max_gap_pct+"% · scope mismatch disclosed":provider.status??"Provider context pending"}</small></article>
  </div>
  <section className="thesis-success-rate"><div><span className="mini-label">EXPLORER SAMPLE SUCCESS RATE</span><strong>{sampleSuccess}</strong><small>Basis: {rateBasis}</small></div><p>Calculated from each day’s unique timestamped Explorer records in the same published daily-quality series used by Analytics. Do not confuse settlement success with user retention or economic quality.</p></section>
  <h2 className="subsection-title">Our falsifiable underwriting tests</h2>
  <div className="thesis-test-list">{thesisTriggers.map(([title,condition,meaning],i)=><article key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{condition}</p><small>{meaning}</small></div></article>)}</div>
  <section className="thesis-risk"><CircleAlert size={19}/><div><strong>The biggest unresolved investment question is token value capture.</strong><p>NEAR Intents has a separately reported holder-revenue series for buybacks beginning 2026-02-23. Buybacks are not burns, and neither gross fees nor captured revenue alone proves lasting per-token value. Deca still needs to compare buybacks with issuance, unlocks and dilution before making a token-level valuation claim.</p></div></section>
  <section className="rerun-card"><div className="rerun-head"><div><span className="mini-label">REPRODUCIBILITY</span><h2>Re-run this yourself.</h2><p>Clone the repo, keep the Explorer JWT in an environment variable, then run the same collection and verification steps.</p></div><Terminal size={22}/></div>
   <pre><code>{'git clone https://github.com/ExoDus768/Deca.git\ncd Deca\npython -m pip install -r requirements.txt\nexport NEAR_INTENTS_EXPLORER_TOKEN="YOUR_JWT"\nDECA_EXPLORER_MAX_PAGES=200 python src/snapshot.py\npython src/normalize_explorer.py\npython src/normalize_defillama.py\npython src/normalize_defillama_fees.py\nmake publish && make verify'}</code></pre>
   <p className="rerun-note">Never commit the JWT or paste it into the dashboard. DefiLlama endpoints are public; the Explorer token is required only for the authenticated Explorer fetch.</p>
   <a href="https://github.com/ExoDus768/Deca/actions" target="_blank" rel="noreferrer">Open GitHub Actions to run the refresh <ArrowUpRight size={14}/></a>
  </section>
  <div className="page-actions"><Link href="/analytics">Explore the underlying data <ArrowUpRight size={14}/></Link><Link href="/methodology">Read the methodology <ArrowUpRight size={14}/></Link></div>
 </section></main>;
}

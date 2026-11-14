import volumeDoc from "../../data/metrics/intents_daily_volume_usd.json";
import txDoc from "../../data/metrics/daily_transactions.json";
import qualityDoc from "../../data/metrics/daily_quality.json";
import hourlyDoc from "../../data/metrics/hourly_activity.json";
import SiteNav from "../components/site-nav";
import AnalyticsClient from "./analytics-client";
export const dynamic = "force-dynamic";
export default function AnalyticsPage(){
 const v=volumeDoc;
 const t=txDoc;
 const q=qualityDoc;
 const h=hourlyDoc;
 const volume=v?.series?.intents_explorer??{};
 const tx=t?.series?.intents_explorer??{};
 const quality=q?.series?.intents_explorer??{};
 const hourly=h?.series?.intents_explorer??{};
 const dates=[...new Set([...Object.keys(volume),...Object.keys(tx),...Object.keys(quality)])].sort();
 const rows=dates.map(date=>({date,volume:Number(volume[date]??0),transactions:Number(tx[date]??0),records:Number(quality[date]?.unique_records??0),successRate:quality[date]?.success_rate_pct==null?null:Number(quality[date].success_rate_pct)}));
 const hourlyRows=Object.entries(hourly).sort(([a],[b])=>a.localeCompare(b)).map(([date,x]:[string,any])=>({date,volume:Number(x.volume_usd??0),transactions:Number(x.successful_transactions??0),records:Number(x.unique_records??0),successRate:x.success_rate_pct==null?null:Number(x.success_rate_pct)}));
 return <main><SiteNav/><AnalyticsClient rows={rows} hourlyRows={hourlyRows} metadata={v?.metadata??{}}/><footer className="footer wrap"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true">◈</span><span>deca<span className="brand-dot">.</span></span></a><span>Analytics · Evidence first.</span><span>UTC</span></footer></main>;
}

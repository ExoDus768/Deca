"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Download, Info, SlidersHorizontal } from "lucide-react";

type Row={date:string;volume:number;transactions:number;records:number;successRate:number|null};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const compact=(n:number)=>new Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:2}).format(n);
const dateLabel=(s:string)=>{const d=new Date(s.includes("T")?s:s+"T00:00:00Z");return d.toLocaleDateString("en",{month:"short",day:"numeric",timeZone:"UTC"})+(s.includes("T")?", "+d.toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"UTC"}):"");};
function csv(rows:Row[]){const header="date,volume_usd,successful_transactions,unique_records,success_rate_pct,average_swap_usd";const body=rows.map(r=>[r.date,r.volume,r.transactions,r.records,r.successRate??"",r.transactions?r.volume/r.transactions:0].join(","));return [header,...body].join("\n");}
export default function AnalyticsClient({rows,hourlyRows,metadata}:{rows:Row[];hourlyRows:Row[];metadata:Record<string,any>}){
 const [preset,setPreset]=useState("30");
 const [start,setStart]=useState(rows[0]?.date??"");
 const [end,setEnd]=useState(rows.at(-1)?.date??"");
 const [metric,setMetric]=useState("volume");
 const [view,setView]=useState("daily");
 const [showCompare,setShowCompare]=useState(true);
 const [threshold,setThreshold]=useState("all");
 const [sort,setSort]=useState<"desc"|"asc">("desc");
 const filtered=useMemo(()=>{
  const daily=preset!=="custom"&&rows.length?(preset==="all"?rows:rows.slice(-Number(preset))):rows.filter(r=>r.date>=start&&r.date<=end);
  if(view==="hourly"){
   const from=daily[0]?.date??start,to=daily.at(-1)?.date??end;
   return hourlyRows.filter(r=>r.date.slice(0,10)>=from&&r.date.slice(0,10)<=to).filter(r=>threshold==="high"?r.volume>=1000000:threshold==="low"?r.volume<1000000:true);
  }
  let list=daily;
  if(threshold==="high")list=list.filter(r=>r.volume>=1000000);
  if(threshold==="low")list=list.filter(r=>r.volume<1000000);
  if(view==="weekly"||view==="monthly"){const map=new Map<string,Row>();for(const r of list){const d=new Date(r.date+"T00:00:00Z");let key=r.date;if(view==="weekly"){const monday=new Date(d);monday.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));key=monday.toISOString().slice(0,10);}else{key=r.date.slice(0,7)+"-01";}const x=map.get(key)??{date:key,volume:0,transactions:0,records:0,successRate:null};x.volume+=r.volume;x.transactions+=r.transactions;x.records+=r.records;x.successRate=x.records?x.transactions/x.records*100:null;map.set(key,x);}return [...map.values()];}
  return list;
 },[rows,hourlyRows,start,end,preset,threshold,view]);
 const values=filtered.map(r=>metric==="volume"?r.volume:metric==="transactions"?r.transactions:metric==="success_rate"?(r.successRate??0):r.transactions?r.volume/r.transactions:0);
 const total=metric==="success_rate"?(filtered.length?values.reduce((a,b)=>a+b,0)/filtered.filter(r=>r.successRate!==null).length:0):values.reduce((a,b)=>a+b,0);
 const avg=values.length?(metric==="success_rate"?total:total/values.length):0;
 const max=Math.max(1,...values);
 const min=values.length?Math.min(...values):0;
 const comparisonRows=view==="hourly"?hourlyRows:rows;
 const previousCount=view==="hourly"?filtered.length:view==="daily"?filtered.length:view==="weekly"?filtered.length*7:filtered.length*30;
 const previous=showCompare&&filtered.length?comparisonRows.filter(r=>r.date<filtered[0].date).slice(-previousCount):[];
 const previousTotal=metric==="success_rate"?(previous.length?previous.reduce((s,r)=>s+(r.successRate??0),0)/previous.filter(r=>r.successRate!==null).length:0):previous.reduce((s,r)=>s+(metric==="volume"?r.volume:metric==="transactions"?r.transactions:r.transactions?r.volume/r.transactions:0),0);
 const delta=previousTotal?((total-previousTotal)/previousTotal)*100:null;
 const sorted=[...filtered].sort((a,b)=>sort==="desc"?b.volume-a.volume:a.volume-b.volume);
 const csvRows=filtered;
 function download(){const blob=new Blob([csv(csvRows)],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="deca-analytics.csv";a.click();URL.revokeObjectURL(url);}
 const metricLabel=metric==="volume"?"Volume (USD)":metric==="transactions"?"Successful transactions":metric==="success_rate"?"Success rate (%)":"Average swap size (USD)";
 return <section className="analytics-page wrap">
  <div className="page-intro"><div><div className="eyebrow"><i className="eyebrow-dot"/> ANALYTICS WORKSPACE <span className="eyebrow-index">/ 01</span></div><h1>Explore the data.</h1><p>Control the observation window, choose indicators and inspect the underlying daily measurements.</p></div><button className="export-button" onClick={download}><Download size={15}/> Export CSV</button></div>
  <div className="filter-panel"><div className="filter-title"><span><SlidersHorizontal size={16}/> ANALYSIS CONTROLS</span><span className="filter-note">All dates and times are UTC</span></div>
   <div className="preset-row">{[["7","7D"],["30","30D"],["90","90D"],["all","All data"],["custom","Custom"]].map(([v,l])=><button key={v} className={preset===v?"preset active":"preset"} onClick={()=>{setPreset(v);if(v==="custom"){setStart(rows[0]?.date??"");setEnd(rows.at(-1)?.date??"");}}}>{l}</button>)}</div>
   <div className="filter-grid"><label><span>Start date</span><input type="date" value={start} max={end||undefined} onChange={e=>{setStart(e.target.value);setPreset("custom");}}/></label><label><span>End date</span><input type="date" value={end} min={start||undefined} onChange={e=>{setEnd(e.target.value);setPreset("custom");}}/></label><label><span>Metric / parameter</span><select value={metric} onChange={e=>setMetric(e.target.value)}><option value="volume">Observed volume (USD)</option><option value="transactions">Successful transactions</option><option value="average">Average swap size (USD)</option><option value="success_rate">Success rate (%)</option></select></label><label><span>Time aggregation</span><select value={view} onChange={e=>setView(e.target.value)}><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label><span>Volume filter</span><select value={threshold} onChange={e=>setThreshold(e.target.value)}><option value="all">All days</option><option value="high">High volume (≥ $1M)</option><option value="low">Below $1M</option></select></label></div>
   <label className="compare-toggle"><input type="checkbox" checked={showCompare} onChange={e=>setShowCompare(e.target.checked)}/> Compare with previous equivalent period</label>
  </div>
  <div className="analytics-kpis"><article><span>{metricLabel} · {metric==="success_rate"?"AVERAGE":"TOTAL"}</span><strong>{metric==="volume"?money(total):metric==="success_rate"?total.toFixed(2)+"%":compact(total)+(metric==="transactions"?" swaps":"")}</strong><small>{filtered.length} {view==="hourly"?"hours":view==="daily"?"days":view==="weekly"?"weeks":"months"} in selected sample</small></article><article><span>DAILY / PERIOD AVERAGE</span><strong>{metric==="volume"?money(avg):metric==="success_rate"?avg.toFixed(2)+"%":compact(avg)}</strong><small>Average per displayed interval</small></article><article><span>MAXIMUM</span><strong>{metric==="volume"?money(max):metric==="success_rate"?max.toFixed(2)+"%":compact(max)}</strong><small>Minimum: {metric==="volume"?money(min):metric==="success_rate"?min.toFixed(2)+"%":compact(min)}</small></article><article><span>PREVIOUS PERIOD</span><strong className={delta===null?"":delta>=0?"positive":"negative"}>{delta===null?"—":(delta>0?"+":"")+delta.toFixed(1)+"%"}</strong><small>{showCompare?"Compared with previous equivalent window":"Comparison disabled"}</small></article></div>
  <section className="analytics-chart"><div className="panel-heading"><div><span className="mini-label">TIME SERIES</span><h2>{metricLabel}</h2><p>{filtered[0]?dateLabel(filtered[0].date):"No matching dates"}{filtered.length>1?" — "+dateLabel(filtered.at(-1)!.date):""}</p></div><span className="quiet-pill">{view.toUpperCase()}</span></div>
   {filtered.length?<div className="analytics-bars">{filtered.map((r,i)=>{const v=values[i];return <div className="analytics-bar-col" key={r.date} title={r.date+": "+(metric==="volume"?money(v):compact(v))}><span>{compact(v)}</span><i style={{height:Math.max(3,v/max*180)+"px"}}/><small>{dateLabel(r.date)}</small></div>})}</div>:<div className="analytics-empty">No records match these filters. Expand the date range.</div>}
   <div className="chart-foot"><span><i/> {metricLabel}</span><span>Source: public 1Click Explorer · UTC</span></div>
  </section>
  <section className="table-panel"><div className="panel-heading"><div><span className="mini-label">OBSERVATION TABLE</span><h2>{view==="hourly"?"Hourly measurements":"Daily measurements"}</h2></div><button className="sort-button" onClick={()=>setSort(v=>v==="desc"?"asc":"desc")}>Sort volume {sort==="desc"?<ArrowDown size={13}/>:<ArrowUp size={13}/>}</button></div>
   <div className="table-scroll"><table><thead><tr><th>Date (UTC)</th><th>Observed volume</th><th>Successful swaps</th><th>Success rate</th><th>Average swap size</th></tr></thead><tbody>{sorted.map(r=><tr key={r.date}><td>{dateLabel(r.date)} <small>{r.date}</small></td><td>{money(r.volume)}</td><td>{r.transactions.toLocaleString()}</td><td>{r.successRate==null?"—":r.successRate.toFixed(2)+"%"}</td><td>{r.transactions?money(r.volume/r.transactions):"—"}</td></tr>)}</tbody></table></div>
  </section>
  <div className="analytics-footnote"><Info size={15}/><p>Hourly activity is derived from the Explorer transaction timestamps and grouped into UTC clock hours. Hourly history is limited to the timestamps present in retained snapshots; minute-level activity is not available. Daily, weekly and monthly views aggregate the same underlying daily series. No values are interpolated.</p></div>
 </section>
}

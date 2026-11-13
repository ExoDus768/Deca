"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, BookOpen, ChartNoAxesCombined, FlaskConical, FileText, Github, House, TrendingUp } from "lucide-react";

const items = [
  { href: "/", label: "Overview", detail: "Key ecosystem metrics", icon: House },
  { href: "/analytics", label: "Analytics", detail: "Explore time ranges and indicators", icon: ChartNoAxesCombined },
  { href: "/investment", label: "Investment signals", detail: "Evidence-led assessment", icon: TrendingUp },
  { href: "/methodology", label: "Methodology", detail: "Definitions and data quality", icon: FlaskConical },
  { href: "/docs", label: "Documentation", detail: "Sources, metrics and limitations", icon: BookOpen },
];
export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);
  return <header className="site-header" ref={root}>
    <div className="site-header-inner wrap">
      <div className="menu-anchor">
        <button className="menu-trigger" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen(v => !v)}>
          {open ? <X size={19}/> : <Menu size={20}/>} <span>Menu</span><ChevronDown size={13} className={open ? "chevron-open" : ""}/>
        </button>
        {open && <div className="menu-dropdown">
          <div className="menu-caption">DECA WORKSPACE</div>
          {items.map(item => { const Icon = item.icon; return <Link href={item.href} key={item.href} className="menu-item" onClick={() => setOpen(false)}><span className="menu-item-icon"><Icon size={17}/></span><span><strong>{item.label}</strong><small>{item.detail}</small></span></Link>; })}
          <div className="menu-divider"/>
          <a className="menu-github" href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer"><Github size={15}/> Source repository <span>↗</span></a>
        </div>}
      </div>
      <Link className="brand" href="/"><span className="brand-mark">d</span><span>deca<span className="brand-dot">.</span></span></Link>
      <div className="header-right"><span className="header-status"><i/> DATA WORKSPACE</span><a className="header-github" href="https://github.com/ExoDus768/Deca" target="_blank" rel="noreferrer"><Github size={15}/></a></div>
    </div>
  </header>;
}

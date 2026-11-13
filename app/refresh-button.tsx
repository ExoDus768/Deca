"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function refresh() {
    if (state === "loading") return;
    setState("loading"); setMessage("Requesting a fresh Explorer snapshot…");
    try {
      const response = await fetch("/api/refresh", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Refresh could not be started.");
      setState("success"); setMessage("Refresh started. New metrics will appear after the workflow publishes them.");
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Refresh failed.");
    }
  }
  return <div className="refresh-wrap">
    <button className="nav-cta" onClick={refresh} disabled={state === "loading"} aria-live="polite">
      <RefreshCw size={14} className={state === "loading" ? "spin" : ""}/>{state === "loading" ? "Starting…" : "Refresh data"}
    </button>
    {message && <span className={"refresh-message " + state} role="status">{message}</span>}
  </div>;
}

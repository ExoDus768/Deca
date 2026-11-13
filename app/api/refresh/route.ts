import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.DECA_GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Dashboard refresh is not connected yet. Add the DECA_GITHUB_TOKEN secret to the Vercel project." },
      { status: 503 }
    );
  }
  const response = await fetch(
    "https://api.github.com/repos/ExoDus768/Deca/actions/workflows/explorer-refresh.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
      cache: "no-store",
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    console.error("Deca refresh dispatch failed:", response.status, detail);
    return NextResponse.json({ error: "GitHub could not start the refresh. Check the dashboard's GitHub token permissions." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status: "queued" }, { status: 202 });
}

"""Fetch enabled JSON sources and record SHA-256 snapshot hashes.

The NEAR Intents Explorer adapter uses its documented cursor pagination.
It waits at least five seconds between requests to respect the partner rate limit.
"""
import datetime as dt
import hashlib
import json
import os
import pathlib
import time
import urllib.parse
import urllib.request

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "manifest.json"
EXPLORER_PAGE_SIZE = 1000
EXPLORER_MIN_INTERVAL_SECONDS = 5.1


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def request_json(url: str, headers: dict, timeout: int = 45):
    request = urllib.request.Request(url, method="GET", headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()
    return raw, json.loads(raw)


def fetch_explorer_pages(name: str, cfg: dict) -> list[tuple[str, bytes]]:
    url = cfg.get("url", "")
    if not cfg.get("enabled", False):
        raise ValueError(f"{name}: source is disabled; verify its endpoint/schema first")
    if not url.startswith("https://") or "TODO" in url:
        raise ValueError(f"{name}: configure a verified HTTPS endpoint")

    auth_env = cfg.get("auth_env")
    token = os.environ.get(auth_env) if auth_env else None
    if not token:
        raise ValueError(f"{name}: required environment variable {auth_env} is not set")

    max_pages = int(os.environ.get("DECA_EXPLORER_MAX_PAGES", "10"))
    if not 1 <= max_pages <= 500:
        raise ValueError("DECA_EXPLORER_MAX_PAGES must be between 1 and 500")

    parts = urllib.parse.urlsplit(url)
    query = dict(urllib.parse.parse_qsl(parts.query, keep_blank_values=True))
    query["numberOfTransactions"] = str(EXPLORER_PAGE_SIZE)
    query["direction"] = "next"
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "deca-evidence-pipeline/0.2",
        "Accept": "application/json",
    }

    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H-%M-%SZ")
    pages: list[tuple[str, bytes]] = []
    seen_cursors: set[tuple[str, str]] = set()
    previous_request_at = 0.0

    for page_number in range(1, max_pages + 1):
        # Explorer allows one request every five seconds per partner.
        wait = EXPLORER_MIN_INTERVAL_SECONDS - (time.monotonic() - previous_request_at)
        if previous_request_at and wait > 0:
            print(f"Rate-limit pause: {wait:.1f}s")
            time.sleep(wait)

        page_url = urllib.parse.urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment)
        )
        raw, payload = request_json(page_url, headers)
        previous_request_at = time.monotonic()

        if isinstance(payload, dict):
            rows = payload.get("transactions")
        else:
            rows = payload
        if not isinstance(rows, list):
            raise ValueError(f"{name}: expected an array of transactions, got {type(rows).__name__}")
        if not rows:
            print(f"{name}: page {page_number} empty; reached end of available history.")
            break

        filename = f"{stamp}-page-{page_number:04d}.json"
        pages.append((filename, raw))
        print(f"{name}: fetched page {page_number}/{max_pages} ({len(rows)} records)")

        if len(rows) < EXPLORER_PAGE_SIZE:
            print(f"{name}: final short page; reached end of available history.")
            break

        last = rows[-1]
        address = last.get("depositAddress")
        memo = last.get("depositMemo")
        if not address:
            raise ValueError(f"{name}: last row on page {page_number} has no depositAddress; refusing unsafe pagination")
        cursor = (str(address), "" if memo is None else str(memo))
        if cursor in seen_cursors:
            raise ValueError(f"{name}: repeated pagination cursor on page {page_number}; stopping to prevent duplicate loop")
        seen_cursors.add(cursor)
        query["lastDepositAddress"] = cursor[0]
        if cursor[1]:
            query["lastDepositMemo"] = cursor[1]
        else:
            query.pop("lastDepositMemo", None)

    if not pages:
        raise ValueError(f"{name}: Explorer returned no transaction pages")
    if len(pages) == max_pages:
        print(
            f"{name}: stopped at configured page cap ({max_pages}). "
            "History may remain; increase DECA_EXPLORER_MAX_PAGES for a deeper backfill."
        )
    return pages


def fetch(name: str, cfg: dict) -> bytes:
    url = cfg.get("url", "")
    if not cfg.get("enabled", False):
        raise ValueError(f"{name}: source is disabled; verify its endpoint/schema first")
    if not url.startswith(("https://", "http://")) or "TODO" in url:
        raise ValueError(f"{name}: configure a verified HTTP(S) endpoint")
    body = cfg.get("body")
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json", "User-Agent": "deca-evidence-pipeline/0.2"}
    auth_env = cfg.get("auth_env")
    if auth_env:
        token = os.environ.get(auth_env)
        if not token:
            raise ValueError(f"{name}: required environment variable {auth_env} is not set")
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        url,
        data=payload,
        method=cfg.get("method", "POST" if payload else "GET"),
        headers=headers,
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read()
    json.loads(raw)
    return raw


def main() -> None:
    config = yaml.safe_load((ROOT / "sources.yaml").read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    day = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    enabled = [(name, cfg) for name, cfg in config["sources"].items() if cfg.get("enabled")]
    if not enabled:
        raise SystemExit("No sources enabled. Verify provider endpoints before enabling refresh.")

    for name, cfg in enabled:
        if name == "intents_explorer":
            snapshots = fetch_explorer_pages(name, cfg)
            for filename, raw in snapshots:
                path = RAW / name / filename
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(raw)
                rel = path.relative_to(ROOT).as_posix()
                manifest[rel] = sha256(raw)
                print(f"saved {rel} sha256={manifest[rel]}")
        else:
            raw = fetch(name, cfg)
            path = RAW / name / f"{day}.json"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            rel = path.relative_to(ROOT).as_posix()
            manifest[rel] = sha256(raw)
            print(f"saved {rel} sha256={manifest[rel]}")

    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

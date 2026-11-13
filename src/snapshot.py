"""Fetch enabled JSON sources and record SHA-256 snapshot hashes."""
import datetime as dt
import hashlib
import json
import pathlib
import urllib.request

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFEST = ROOT / "data" / "manifest.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(name: str, cfg: dict) -> bytes:
    url = cfg.get("url", "")
    if not cfg.get("enabled", False):
        raise ValueError(f"{name}: source is disabled; verify its endpoint/schema first")
    if not url.startswith(("https://", "http://")) or "TODO" in url:
        raise ValueError(f"{name}: configure a verified HTTP(S) endpoint")
    body = cfg.get("body")
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url,
        data=payload,
        method=cfg.get("method", "POST" if payload else "GET"),
        headers={"Content-Type": "application/json", "User-Agent": "deca-evidence-pipeline/0.1"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read()
    # Fail early rather than snapshotting an HTML error page as valid data.
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

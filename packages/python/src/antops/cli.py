from __future__ import annotations

import argparse
import json
import os
import stat
import sys
from pathlib import Path
from typing import Any

from antops.client import DEFAULT_BASE_URL, AntOpsClient
from antops.errors import AntOpsError

CONFIG_PATH = Path.home() / ".config" / "antops" / "config.json"
EXIT_BLOCKED = 4
EXIT_ERROR = 2
MAX_CHANGE_RISK_FILES = 20
MAX_CHANGE_RISK_FILE_BYTES = 100_000


def _config_key() -> str | None:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8")).get("api_key")
    except (OSError, ValueError):
        return None


def _client() -> AntOpsClient:
    api_key = os.environ.get("ANTOPS_API_KEY") or _config_key()
    if not api_key:
        raise AntOpsError("Set ANTOPS_API_KEY or run 'antops auth login --stdin'.")
    return AntOpsClient(api_key, base_url=os.environ.get("ANTOPS_BASE_URL", DEFAULT_BASE_URL), client_id="cli/0.1.0")


def _print(value: Any, as_json: bool) -> None:
    if as_json:
        print(json.dumps(value, separators=(",", ":"), default=str))
    else:
        print(json.dumps(value, indent=2, default=str))


def _write_config(api_key: str) -> None:
    CONFIG_PATH.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary = CONFIG_PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps({"api_key": api_key}) + "\n", encoding="utf-8")
    temporary.chmod(stat.S_IRUSR | stat.S_IWUSR)
    temporary.replace(CONFIG_PATH)
    CONFIG_PATH.chmod(stat.S_IRUSR | stat.S_IWUSR)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="antops", description="AntOps production API CLI")
    parser.add_argument("--json", action="store_true", help="emit compact machine-readable JSON")
    commands = parser.add_subparsers(dest="command", required=True)

    auth = commands.add_parser("auth")
    auth_commands = auth.add_subparsers(dest="auth_command", required=True)
    auth_commands.add_parser("status")
    login = auth_commands.add_parser("login")
    login.add_argument("--stdin", action="store_true", required=True, help="read key from standard input")

    company = commands.add_parser("company")
    company_commands = company.add_subparsers(dest="company_command", required=True)
    lookup = company_commands.add_parser("lookup")
    lookup.add_argument("jurisdiction")
    lookup.add_argument("registration_number")
    watch = company_commands.add_parser("watch")
    watch.add_argument("jurisdiction")
    watch.add_argument("registration_number")
    watch.add_argument("--interval", type=int, default=86_400)

    domain = commands.add_parser("domain")
    domain_commands = domain.add_subparsers(dest="domain_command", required=True)
    check = domain_commands.add_parser("check")
    check.add_argument("domain")
    monitor = domain_commands.add_parser("monitor")
    monitor.add_argument("domain")
    monitor.add_argument("--customer-label")
    monitor.add_argument("--interval", type=int, default=3600)
    status = domain_commands.add_parser("status")
    status.add_argument("asset_id")

    tender = commands.add_parser("tender")
    tender_commands = tender.add_subparsers(dest="tender_command", required=True)
    search = tender_commands.add_parser("search")
    search.add_argument("--keyword", action="append", default=[])
    search.add_argument("--jurisdiction")
    search.add_argument("--page", type=int, default=1)
    search.add_argument("--page-size", type=int, default=25)

    risk = commands.add_parser("change-risk")
    risk_commands = risk.add_subparsers(dest="risk_command", required=True)
    analyze = risk_commands.add_parser("analyze")
    analyze.add_argument("files", nargs="+", type=Path)
    analyze.add_argument("--revision")

    document = commands.add_parser("document")
    document_commands = document.add_subparsers(dest="document_command", required=True)
    scan = document_commands.add_parser("scan")
    scan.add_argument("path", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "auth" and args.auth_command == "login":
        key = sys.stdin.readline().strip()
        if not key:
            print("No API key received on standard input.", file=sys.stderr)
            return EXIT_ERROR
        _write_config(key)
        _print({"authenticated": True, "key_source": "config"}, args.json)
        return 0
    try:
        with _client() as client:
            if args.command == "auth":
                result = client.get("/v1/workspace")
            elif args.command == "company":
                result = client.company.lookup(args.jurisdiction, args.registration_number) if args.company_command == "lookup" else client.company.watch(args.jurisdiction, args.registration_number, interval_seconds=args.interval)
            elif args.command == "domain":
                if args.domain_command == "check":
                    result = client.domains.check(args.domain)
                elif args.domain_command == "monitor":
                    result = client.domains.monitor(args.domain, customer_label=args.customer_label, interval_seconds=args.interval)
                else:
                    result = client.domains.status(args.asset_id)
            elif args.command == "tender":
                result = client.tenders.search(keywords=args.keyword, jurisdiction=args.jurisdiction, page=args.page, page_size=args.page_size)
            elif args.command == "change-risk":
                if len(args.files) > MAX_CHANGE_RISK_FILES:
                    raise OSError(f"At most {MAX_CHANGE_RISK_FILES} files may be submitted.")
                files = []
                for path in args.files:
                    if path.stat().st_size > MAX_CHANGE_RISK_FILE_BYTES:
                        raise OSError(f"File exceeds {MAX_CHANGE_RISK_FILE_BYTES} bytes: {path}")
                    files.append({"path": str(path), "content": path.read_text(encoding="utf-8")})
                result = client.change_risk.analyze(files, revision=args.revision)
                _print(result, args.json)
                return EXIT_BLOCKED if result.get("decision") == "blocked" else 0
            else:
                result = client.documents.upload(args.path)
            _print(result, args.json)
            return 0
    except (OSError, UnicodeDecodeError) as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        return EXIT_ERROR
    except AntOpsError as exc:
        print(str(exc), file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    raise SystemExit(main())

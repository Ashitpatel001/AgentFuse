#!/usr/bin/env python3
"""
API Drift Test:
Extracts every /api/... call from frontend/src and site/src and asserts
each method + path exists in the FastAPI OpenAPI schema.
"""

import os
import re
import sys
from typing import Dict, List, Set, Tuple

# Add workspace to sys.path so we can import the FastAPI app
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if WORKSPACE_DIR not in sys.path:
    sys.path.insert(0, WORKSPACE_DIR)

from agentfuse.server.api import app


def get_openapi_endpoints() -> Dict[str, Set[str]]:
    """Return dict of {normalized_path: set(http_methods)} from FastAPI schema."""
    schema = app.openapi()
    openapi_map: Dict[str, Set[str]] = {}

    for path, methods in schema.get("paths", {}).items():
        # Normalize {param} to generic {*} for comparison
        norm_path = re.sub(r"\{[a-zA-Z0-9_]+\}", "{param}", path)
        if norm_path not in openapi_map:
            openapi_map[norm_path] = set()
        for method in methods.keys():
            if method.lower() != "parameters":
                openapi_map[norm_path].add(method.upper())

    return openapi_map


def scan_frontend_calls() -> List[Tuple[str, str, str]]:
    """
    Scan frontend/src and site/src for /api/... calls.
    Returns list of (method, path, source_location).
    """
    results: List[Tuple[str, str, str]] = []
    scan_dirs = [
        os.path.join(WORKSPACE_DIR, "frontend", "src"),
        os.path.join(WORKSPACE_DIR, "site", "src")
    ]

    # Regex patterns for API calls in TypeScript/JavaScript
    # e.g.: fetchWithAuth('/api/...', { method: 'POST' })
    # e.g.: fetch(`/api/...`, ...)
    api_pattern = re.compile(
        r"""(?:fetchWithAuth|fetch)\s*\(\s*[`'"](?P<path>/api/[^`'"]*)[`'"](?:\s*,\s*\{[^}]*?method\s*:\s*['"](?P<method>[A-Z]+)['"][^}]*?\})?""",
        re.DOTALL
    )

    # Docs text matches (e.g. <div>GET /api/whoami</div>)
    docs_pattern = re.compile(
        r"""\b(?P<method>GET|POST|PUT|DELETE)\s+(?P<path>/api/[a-zA-Z0-9_/\-?&=;]+)"""
    )

    for s_dir in scan_dirs:
        for root, _, files in os.walk(s_dir):
            for file in files:
                if file.endswith((".ts", ".tsx")):
                    fpath = os.path.join(root, file)
                    rel_path = os.path.relpath(fpath, WORKSPACE_DIR)
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()

                    # Find function calls
                    for match in api_pattern.finditer(content):
                        raw_path = match.group("path")
                        method = match.group("method") or "GET"
                        results.append((method.upper(), raw_path, rel_path))

                    # If file is a docs page, find doc endpoints
                    if "Docs" in file:
                        for match in docs_pattern.finditer(content):
                            method = match.group("method")
                            raw_path = match.group("path")
                            results.append((method.upper(), raw_path, rel_path))

    return results


def normalize_client_path(raw_path: str) -> str:
    """Normalize query strings and template interpolation into standard {param}."""
    # Strip query parameters (e.g. ?skip=... or ?format=...)
    path = raw_path.split("?")[0]
    # Replace ${...} template variables with {param}
    path = re.sub(r"\$\{[^}]+\}", "{param}", path)
    # Strip trailing slashes
    if path != "/" and path.endswith("/"):
        path = path[:-1]
    return path


def main():
    print("=================================================================")
    print("               AGENTFUSE API DRIFT VERIFICATION                  ")
    print("=================================================================")

    openapi_map = get_openapi_endpoints()
    client_calls = scan_frontend_calls()

    # Deduplicate client calls by (method, normalized_path)
    deduped_calls: Dict[Tuple[str, str], List[str]] = {}
    for method, raw_path, location in client_calls:
        norm_path = normalize_client_path(raw_path)
        key = (method, norm_path)
        if key not in deduped_calls:
            deduped_calls[key] = []
        deduped_calls[key].append(location)

    mismatches = []
    verified_matrix = []

    for (method, norm_path), locs in sorted(deduped_calls.items()):
        # Check if norm_path is in openapi_map and method matches
        if norm_path in openapi_map:
            if method in openapi_map[norm_path]:
                verified_matrix.append((method, norm_path, "MATCH", locs[0]))
            else:
                mismatches.append(f"METHOD MISMATCH: {method} {norm_path} (OpenAPI has {openapi_map[norm_path]}) in {locs[0]}")
        else:
            mismatches.append(f"MISSING ROUTE: {method} {norm_path} not found in FastAPI OpenAPI schema (from {locs[0]})")

    print(f"\nDiscovered {len(deduped_calls)} distinct API operations in frontend/site source code:")
    print("-" * 75)
    print(f"{'METHOD':<8} {'PATH':<42} {'STATUS':<10} {'SOURCE'}")
    print("-" * 75)
    for method, path, status, src in verified_matrix:
        print(f"{method:<8} {path:<42} {status:<10} {src}")

    if mismatches:
        print("\n[!] DRIFT DETECTED:")
        for m in mismatches:
            print(f"  - {m}")
        sys.exit(1)
    else:
        print("\n[✓] ZERO API DRIFT: All frontend calls strictly match FastAPI OpenAPI schema.")
        sys.exit(0)


if __name__ == "__main__":
    main()

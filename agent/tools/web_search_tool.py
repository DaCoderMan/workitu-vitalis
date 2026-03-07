"""Web search tool — search the internet and read web pages.

Uses DuckDuckGo (free, no API key needed).
"""

import json
import logging

import requests
from bs4 import BeautifulSoup

log = logging.getLogger("bee-agent")

_TIMEOUT = 10

# ─── Tool Definitions ────────────────────────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "web_search",
        "description": "Search the internet using DuckDuckGo. Returns titles, URLs, and snippets. Good for researching topics, finding current information, competitor analysis, and learning about regulations.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query in any language",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum results to return (default 5, max 10)",
                },
                "region": {
                    "type": "string",
                    "description": "Region code for localized results (default 'il-he' for Israel/Hebrew). Use 'wt-wt' for global.",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "web_read_page",
        "description": "Read and extract text content from a web page URL. Returns the main text content, stripped of HTML.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The URL to read",
                },
                "max_chars": {
                    "type": "integer",
                    "description": "Maximum characters to return (default 3000)",
                },
            },
            "required": ["url"],
        },
    },
]

# ─── Implementation ──────────────────────────────────────────────────────────


def web_search(query: str, max_results: int = 5, region: str = "il-he", **kwargs) -> dict:
    """Search the internet via DuckDuckGo."""
    max_results = min(max_results, 10)

    try:
        from duckduckgo_search import DDGS

        with DDGS() as ddgs:
            results = list(ddgs.text(query, region=region, max_results=max_results))

        return {
            "success": True,
            "query": query,
            "count": len(results),
            "results": [
                {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                }
                for r in results
            ],
        }
    except ImportError:
        # Fallback: use DuckDuckGo HTML search
        return _fallback_search(query, max_results)
    except Exception as e:
        return {"error": str(e)}


def _fallback_search(query: str, max_results: int) -> dict:
    """Fallback search using DuckDuckGo HTML (no library needed)."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; BeeAgent/4.0)"}
        resp = requests.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers=headers,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        results = []
        for result in soup.select(".result")[:max_results]:
            title_el = result.select_one(".result__title a")
            snippet_el = result.select_one(".result__snippet")
            if title_el:
                results.append({
                    "title": title_el.get_text(strip=True),
                    "url": title_el.get("href", ""),
                    "snippet": snippet_el.get_text(strip=True) if snippet_el else "",
                })

        return {
            "success": True,
            "query": query,
            "count": len(results),
            "results": results,
            "note": "Used fallback HTML search (duckduckgo-search not installed)",
        }
    except Exception as e:
        return {"error": f"Fallback search failed: {e}"}


def web_read_page(url: str, max_chars: int = 3000, **kwargs) -> dict:
    """Read and extract text from a web page."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; BeeAgent/4.0)"}
        resp = requests.get(url, headers=headers, timeout=_TIMEOUT)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        # Remove script and style elements
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)

        # Clean up excessive whitespace
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)

        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars] + "\n... [truncated]"

        return {
            "success": True,
            "url": url,
            "title": soup.title.string if soup.title else "",
            "content": clean_text,
            "chars": len(clean_text),
        }
    except Exception as e:
        return {"error": str(e)}


# ─── Dispatch ─────────────────────────────────────────────────────────────────

TOOL_HANDLERS = {
    "web_search": web_search,
    "web_read_page": web_read_page,
}


def execute(tool_name: str, args: dict) -> dict:
    """Route tool execution."""
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(**args)

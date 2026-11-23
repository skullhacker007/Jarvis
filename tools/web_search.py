import re
import html
import logging
import urllib.parse
from config import Config

logger = logging.getLogger("NAVI_Search")

class WebSearchTool:
    """
    Real-time web research engine:
    1. Primary: Tavily Search API (factual summaries + source URLs).
    2. Fallback: DuckDuckGo Search (100% free fallback when Tavily is offline or unconfigured).
    """

    def __init__(self):
        self.tavily_client = None
        if Config.TAVILY_API_KEY:
            try:
                from tavily import TavilyClient
                self.tavily_client = TavilyClient(api_key=Config.TAVILY_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize TavilyClient: {e}")

    def search(self, query: str, max_results: int = 3) -> str:
        clean_q = (query or "").strip()
        if not clean_q:
            return "Search query cannot be empty."

        # 1. Primary: Tavily Live Search
        if self.tavily_client:
            try:
                response = self.tavily_client.search(
                    query=clean_q,
                    search_depth="advanced",
                    max_results=max_results,
                    include_raw_content=False
                )
                results = response.get("results", [])
                if results:
                    formatted_output = f"[LIVE WEB SEARCH (TAVILY) FOR: '{clean_q}']\n"
                    for i, r in enumerate(results, start=1):
                        title = r.get("title", "Untitled").strip()
                        url = r.get("url", "").strip()
                        snippet = r.get("content", "").strip()
                        formatted_output += f"{i}. {title}\n   Source: {url}\n   Summary: {snippet}\n\n"
                    return formatted_output.strip()
            except Exception as e:
                logger.warning(f"Tavily search failed ({e}). Failing over to DuckDuckGo...")

        # 2. Fallback: DuckDuckGo Search
        ddg_results = self._duckduckgo_search(clean_q, max_results=max_results)
        if ddg_results:
            return ddg_results

        return f"No verified web results found for: '{clean_q}'"

    def _duckduckgo_search(self, query: str, max_results: int = 3) -> str:
        """Fallback web research using DuckDuckGo HTML & API."""
        try:
            # 1. Try duckduckgo_search package if installed
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    raw_res = list(ddgs.text(query, max_results=max_results))
                    if raw_res:
                        out = f"[LIVE WEB SEARCH (DUCKDUCKGO) FOR: '{query}']\n"
                        for i, r in enumerate(raw_res, start=1):
                            title = r.get("title", "Untitled").strip()
                            url = r.get("href") or r.get("url", "")
                            body = r.get("body") or r.get("snippet", "")
                            out += f"{i}. {title}\n   Source: {url}\n   Summary: {body}\n\n"
                        return out.strip()
            except ImportError:
                pass

            # 2. Direct HTTPS fallback via requests
            import requests
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
            resp = requests.get(url, headers=headers, timeout=6)
            if resp.status_code == 200:
                raw_html = resp.text
                results = []
                # Match result elements: url and snippets
                blocks = re.findall(r'<div class="result__body">.*?<h2[^>]*>.*?href="([^"]+)".*?>(.*?)</a>.*?<a class="result__snippet"[^>]*>(.*?)</a>', raw_html, re.DOTALL)
                for href, title_html, snippet_html in blocks[:max_results]:
                    # Extract clean URL from DuckDuckGo redirect uddg= parameter if present
                    actual_url = href
                    if "uddg=" in href:
                        match = re.search(r'uddg=([^&]+)', href)
                        if match:
                            actual_url = urllib.parse.unquote(match.group(1))

                    clean_title = html.unescape(re.sub(r'<[^>]+>', '', title_html)).strip()
                    clean_snippet = html.unescape(re.sub(r'<[^>]+>', '', snippet_html)).strip()

                    if clean_title and actual_url:
                        results.append((clean_title, actual_url, clean_snippet))

                if results:
                    out = f"[LIVE WEB SEARCH (DUCKDUCKGO) FOR: '{query}']\n"
                    for i, (title, u, snip) in enumerate(results, start=1):
                        out += f"{i}. {title}\n   Source: {u}\n   Summary: {snip}\n\n"
                    return out.strip()

        except Exception as err:
            logger.error(f"DuckDuckGo fallback search failed: {err}")

        return ""

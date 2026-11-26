import re
import html
import time
import logging
import urllib.parse
import urllib.request
from collections import OrderedDict
from config import Config

logger = logging.getLogger("NAVI_Search")

class WebSearchTool:
    """
    Real-time web research engine:
    1. Primary: Tavily Search API (factual summaries + source URLs).
    2. Fallback: DuckDuckGo Search (100% free fallback when Tavily is offline or unconfigured).
    3. Includes TTL caching, relevance ranking, and webpage content extraction/cleaning.
    """

    def __init__(self, cache_ttl_sec: int = 600, cache_max: int = 64):
        self.tavily_client = None
        self._cache: OrderedDict[tuple, tuple[float, str]] = OrderedDict()
        self.cache_ttl_sec = cache_ttl_sec
        self.cache_max = cache_max
        if Config.TAVILY_API_KEY:
            try:
                from tavily import TavilyClient
                self.tavily_client = TavilyClient(api_key=Config.TAVILY_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize TavilyClient: {e}")

    @staticmethod
    def _rank_results(query: str, items: list[dict]) -> list[dict]:
        """Scores and sorts search results by query keyword overlap and source quality."""
        q_tokens = set(re.findall(r"[a-z0-9]{2,}", query.lower()))
        trusted_hints = (".gov", ".edu", "wikipedia.org", "github.com", "docs.", "python.org", "microsoft.com")

        def _score(item: dict) -> float:
            title_l = (item.get("title") or "").lower()
            snip_l = (item.get("snippet") or "").lower()
            url_l = (item.get("url") or "").lower()
            title_hits = sum(2.0 for t in q_tokens if t in title_l)
            snip_hits = sum(1.0 for t in q_tokens if t in snip_l)
            domain_bonus = 1.5 if any(h in url_l for h in trusted_hints) else 0.0
            raw_score = float(item.get("score") or 0.0)
            return raw_score + title_hits + snip_hits + domain_bonus

        return sorted(items, key=_score, reverse=True)

    @staticmethod
    def extract_page_text(url: str, max_chars: int = 1500, timeout: int = 4) -> str:
        """Fetches a webpage and strips scripts, styles, nav, and HTML tags into clean text."""
        if not url or not url.startswith(("http://", "https://")):
            return ""
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                ctype = resp.headers.get("Content-Type", "")
                if "text/html" not in ctype and "text/plain" not in ctype:
                    return ""
                raw_html = resp.read(250_000).decode("utf-8", errors="replace")
            cleaned = re.sub(r"<(script|style|noscript|nav|header|footer|svg)[^>]*>.*?</\1>", " ", raw_html, flags=re.DOTALL | re.IGNORECASE)
            cleaned = re.sub(r"<[^>]+>", " ", cleaned)
            cleaned = html.unescape(re.sub(r"\s+", " ", cleaned)).strip()
            return cleaned[:max_chars]
        except Exception:
            return ""

    def search(self, query: str, max_results: int = 3, extract_content: bool = False) -> str:
        clean_q = (query or "").strip()
        if not clean_q:
            return "Search query cannot be empty."

        cache_key = (clean_q.lower(), max_results, extract_content)
        now = time.time()
        if cache_key in self._cache:
            ts, cached_val = self._cache[cache_key]
            if (now - ts) < self.cache_ttl_sec:
                self._cache.move_to_end(cache_key)
                return cached_val
            del self._cache[cache_key]

        items: list[dict] = []
        provider = "TAVILY"

        # 1. Primary: Tavily Live Search
        if self.tavily_client:
            try:
                response = self.tavily_client.search(
                    query=clean_q,
                    search_depth="advanced",
                    max_results=max_results,
                    include_raw_content=False
                )
                for r in response.get("results", []):
                    items.append({
                        "title": r.get("title", "Untitled").strip(),
                        "url": r.get("url", "").strip(),
                        "snippet": r.get("content", "").strip(),
                        "score": r.get("score", 0.0),
                    })
            except Exception as e:
                logger.warning(f"Tavily search failed ({e}). Failing over to DuckDuckGo...")

        # 2. Fallback: DuckDuckGo Search
        if not items:
            provider = "DUCKDUCKGO"
            items = self._duckduckgo_items(clean_q, max_results=max_results)

        if not items:
            return f"No verified web results found for: '{clean_q}'"

        ranked = self._rank_results(clean_q, items)[:max_results]
        formatted_output = f"[LIVE WEB SEARCH ({provider}) FOR: '{clean_q}']\n"
        for i, r in enumerate(ranked, start=1):
            formatted_output += f"{i}. {r['title']}\n   Source: {r['url']}\n   Summary: {r['snippet']}\n"
            if extract_content and i == 1 and r["url"]:
                extracted = self.extract_page_text(r["url"])
                if extracted:
                    formatted_output += f"   Extracted Content: {extracted}\n"
            formatted_output += "\n"

        final_str = formatted_output.strip()
        self._cache[cache_key] = (now, final_str)
        if len(self._cache) > self.cache_max:
            self._cache.popitem(last=False)
        return final_str

    def _duckduckgo_items(self, query: str, max_results: int = 3) -> list[dict]:
        """Fallback web research using DuckDuckGo HTML & API returning structured items."""
        try:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    raw_res = list(ddgs.text(query, max_results=max_results))
                    if raw_res:
                        return [
                            {
                                "title": r.get("title", "Untitled").strip(),
                                "url": (r.get("href") or r.get("url", "")).strip(),
                                "snippet": (r.get("body") or r.get("snippet", "")).strip(),
                                "score": 0.0,
                            }
                            for r in raw_res
                        ]
            except ImportError:
                pass

            raw_html = ""
            url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
            with urllib.request.urlopen(req, timeout=6) as response:
                raw_html = response.read().decode("utf-8", errors="replace")

            if raw_html:
                results = []
                blocks = re.findall(r'<div class="result__body">.*?<h2[^>]*>.*?href="([^"]+)".*?>(.*?)</a>.*?<a class="result__snippet"[^>]*>(.*?)</a>', raw_html, re.DOTALL)
                for href, title_html, snippet_html in blocks[:max_results]:
                    actual_url = href
                    if "uddg=" in href:
                        match = re.search(r'uddg=([^&]+)', href)
                        if match:
                            actual_url = urllib.parse.unquote(match.group(1))
                    clean_title = html.unescape(re.sub(r'<[^>]+>', '', title_html)).strip()
                    clean_snippet = html.unescape(re.sub(r'<[^>]+>', '', snippet_html)).strip()
                    if clean_title and actual_url:
                        results.append({"title": clean_title, "url": actual_url, "snippet": clean_snippet, "score": 0.0})
                return results
        except Exception as err:
            logger.error(f"DuckDuckGo fallback search failed: {err}")
        return []

    def _duckduckgo_search(self, query: str, max_results: int = 3) -> str:
        """Backward-compatible string wrapper over _duckduckgo_items."""
        items = self._duckduckgo_items(query, max_results=max_results)
        if not items:
            return ""
        lines = [f"[LIVE WEB SEARCH (DUCKDUCKGO) FOR: '{query}']"]
        for i, r in enumerate(items, start=1):
            lines.append(f"{i}. {r['title']}\n   Source: {r['url']}\n   Summary: {r['snippet']}\n")
        return "\n".join(lines).strip()

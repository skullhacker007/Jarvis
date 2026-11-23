import logging
from tavily import TavilyClient
from config import Config

logger = logging.getLogger("NAVI_Search")

class WebSearchTool:
    """
    Real-time web research using Tavily API.
    Returns clean, factual excerpts with explicit URL citations.
    """

    def __init__(self):
        if Config.TAVILY_API_KEY:
            self.client = TavilyClient(api_key=Config.TAVILY_API_KEY)
        else:
            self.client = None
            logger.warning("TAVILY_API_KEY not configured. Web research disabled.")

    def search(self, query: str, max_results: int = 3) -> str:
        if not self.client:
            return "Web research is currently disabled (API key not provided)."

        try:
            response = self.client.search(
                query=query,
                search_depth="advanced",
                max_results=max_results,
                include_raw_content=False
            )

            results = response.get("results", [])
            if not results:
                return f"No verified web results found for: '{query}'"

            formatted_output = f"[LIVE WEB SEARCH RESULTS FOR: '{query}']\n"
            for i, r in enumerate(results, start=1):
                title = r.get("title", "Untitled")
                url = r.get("url", "")
                snippet = r.get("content", "").strip()
                formatted_output += f"{i}. {title}\n   Source: {url}\n   Summary: {snippet}\n\n"

            return formatted_output
        except Exception as e:
            logger.error(f"Tavily search failed: {e}")
            return f"Error executing web search: {str(e)}"

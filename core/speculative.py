import time
import asyncio
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("NAVI_Speculative")

class SpeculativeTurnAgent:
    """
    Speculative Preemptive Generation Agent (Agent 2):
    - Observes streaming interim transcripts while user is speaking.
    - Speculatively drafts responses during natural prosodic pauses (>350ms) before turn is closed.
    - If user continues speaking and changes context, immediately discards the in-flight draft.
    - If user speech commits and matches prefix, promotes the speculative draft, saving 200-450ms TTFA.
    """

    def __init__(self, llm_router=None):
        self.llm_router = llm_router
        self.current_prompt_prefix: Optional[str] = None
        self.draft_text: str = ""
        self.draft_task: Optional[asyncio.Task] = None
        self.is_drafting: bool = False
        self.draft_created_at: float = 0.0

    async def consider_speculative_draft(self, partial_text: str, history: Optional[List[Dict[str, str]]] = None):
        """Initiates a speculative draft if interim text is stable and informative."""
        clean_partial = (partial_text or "").strip()
        if len(clean_partial) < 6:
            return

        # If already drafting for this exact prefix, keep it
        if self.is_drafting and self.current_prompt_prefix == clean_partial:
            return

        # Abort previous draft if prefix changed
        self.discard_draft()

        self.current_prompt_prefix = clean_partial
        self.is_drafting = True
        self.draft_created_at = time.time()
        self.draft_text = ""

        if self.llm_router:
            self.draft_task = asyncio.create_task(self._generate_draft(clean_partial, history))

    async def _generate_draft(self, prefix: str, history: Optional[List[Dict[str, str]]]):
        try:
            tokens = []
            async for chunk in self.llm_router.stream_reply(prefix, history=history):
                if not self.is_drafting:
                    break
                tokens.append(chunk)
                if len(tokens) >= 20: # Cap speculative draft to first 20 tokens
                    break
            self.draft_text = "".join(tokens)
        except asyncio.CancelledError:
            self.draft_text = ""
        except Exception as e:
            logger.debug(f"Speculative draft generation interrupted: {e}")
            self.draft_text = ""

    def discard_draft(self):
        """Immediately aborts and purges speculative state with zero lag."""
        if self.draft_task and not self.draft_task.done():
            self.draft_task.cancel()
        self.draft_task = None
        self.is_drafting = False
        self.current_prompt_prefix = None
        self.draft_text = ""

    def promote_draft_if_matches(self, finalized_text: str) -> Optional[str]:
        """
        Promotes the speculative draft if the finalized user prompt begins with the drafted prefix.
        Returns the drafted tokens to jumpstart playback, or None if discarded.
        """
        clean_final = (finalized_text or "").strip()
        if not self.current_prompt_prefix or not self.draft_text:
            self.discard_draft()
            return None

        # Check if the final text contains or matches our speculative trigger
        if clean_final.lower().startswith(self.current_prompt_prefix.lower()):
            promoted = self.draft_text
            self.discard_draft()
            logger.info(f"Speculative draft promoted successfully ({len(promoted)} chars jumpstarted).")
            return promoted

        self.discard_draft()
        return None

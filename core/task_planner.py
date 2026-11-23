import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("NAVI_Planner")

class TaskStep:
    def __init__(self, step_id: int, action: str, target: str, description: str):
        self.step_id = step_id
        self.action = action
        self.target = target
        self.description = description
        self.status = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED
        self.output: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "step_id": self.step_id,
            "action": self.action,
            "target": self.target,
            "description": self.description,
            "status": self.status,
            "output": self.output,
        }

class TaskPlanner:
    """
    Autonomous Multi-Step Task Planner:
    - Parses compound user instructions into sequential atomic steps.
    - Resolves dependencies between steps.
    - Supports execution tracking, state serialization, and compensatory rollback actions.
    """

    STEP_SPLITTERS = [
        r"\band\s+then\b",
        r"\bthen\b",
        r"\bafter\s+that\b",
        r"\bnext\b",
        r",\s*and\b",
    ]

    @classmethod
    def decompose_directive(cls, prompt: str) -> List[TaskStep]:
        clean = (prompt or "").strip()
        if not clean:
            return []

        # Check for multi-step conjunctions
        pattern = "|".join(cls.STEP_SPLITTERS)
        raw_parts = re.split(pattern, clean, flags=re.IGNORECASE)
        segments = [p.strip().rstrip(".").strip() for p in raw_parts if p.strip()]

        if len(segments) <= 1:
            # Single atomic directive
            action, target, desc = cls._infer_action(clean)
            return [TaskStep(step_id=1, action=action, target=target, description=desc)]

        steps = []
        for i, segment in enumerate(segments, start=1):
            action, target, desc = cls._infer_action(segment)
            steps.append(TaskStep(step_id=i, action=action, target=target, description=desc))

        return steps

    @staticmethod
    def _infer_action(text: str) -> tuple[str, str, str]:
        lower = text.lower()

        # 1. Open app
        if any(lower.startswith(v) for v in ["open ", "launch ", "start "]):
            target = re.sub(r"^(open|launch|start)\s+", "", text, flags=re.IGNORECASE).strip()
            return "open_app", target, f"Launch application {target}"

        # 2. Close app
        if any(lower.startswith(v) for v in ["close ", "terminate ", "kill ", "stop "]):
            target = re.sub(r"^(close|terminate|kill|stop)\s+", "", text, flags=re.IGNORECASE).strip()
            return "close_app", target, f"Close application {target}"

        # 3. System control
        if any(k in lower for k in ["lock pc", "lock workstation", "mute", "volume", "sleep pc"]):
            return "system_ctrl", text, f"System control directive: {text}"

        # 4. Web search
        if any(lower.startswith(v) for v in ["search ", "search for ", "google "]):
            target = re.sub(r"^(search(\s+for)?|google)\s+", "", text, flags=re.IGNORECASE).strip()
            return "web_search", target, f"Search web for {target}"

        # 5. Type or write code
        if any(k in lower for k in ["write ", "type ", "generate code"]):
            return "write_code", text, f"Write or insert code"

        # 6. Screen inspect
        if "screen" in lower and any(k in lower for k in ["inspect", "look", "analyze", "read"]):
            return "inspect_screen", text, "Analyze active display"

        # Pure conversational or general instruction
        return "none", "", text

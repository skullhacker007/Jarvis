import datetime
import os
import platform

class TemporalContext:
    """
    Dynamically injects real-time temporal and system metrics
    into NAVI's prompt so it always knows the exact date, time, and system state
    using the host's live local timezone.
    """

    @staticmethod
    def get_context_block() -> str:
        now_local = datetime.datetime.now().astimezone()
        local_time_str = now_local.strftime("%Y-%m-%d %I:%M:%S %p")
        day_of_week = now_local.strftime("%A")
        tz_name = now_local.tzname() or "Local"
        raw_offset = now_local.strftime("%z") or "+0000"
        utc_offset = f"UTC{raw_offset[:3]}:{raw_offset[3:]}" if len(raw_offset) == 5 else raw_offset

        # Optional hardware metrics
        metrics = ""
        try:
            import psutil
            cpu_usage = psutil.cpu_percent(interval=None)
            ram = psutil.virtual_memory()
            metrics = f"- CPU Usage: {cpu_usage}%\n- RAM Usage: {ram.percent}%\n"
        except ImportError:
            metrics = "- System Metrics: Available via psutil\n"
        except Exception:
            metrics = ""

        location_env = os.getenv("JARVIS_LOCATION", "").strip()
        location_line = f"- Location: {location_env}\n" if location_env else ""

        return (
            f"[SYSTEM TEMPORAL & HARDWARE CONTEXT]\n"
            f"{location_line}"
            f"- Timezone: {utc_offset} ({tz_name})\n"
            f"- Current Date: {now_local.strftime('%B %d, %Y')}\n"
            f"- Current Day: {day_of_week}\n"
            f"- Current Local Time: {local_time_str}\n"
            f"- Host OS: {platform.system()} {platform.release()}\n"
            f"{metrics}"
            f"--------------------------------------------------"
        )

class ContextCompressor:
    """
    Intelligent context management & conversational summarization:
    When chat history grows beyond budget, extracts high-value factual points
    from older turns into an active conversational memory summary instead
    of abruptly dropping conversational continuity.
    """

    @staticmethod
    def compress_history(history: list, max_turns: int = 10) -> list:
        if not history or len(history) <= max_turns:
            return history or []

        # Retain recent active turns (most recent max_turns - 2)
        retain_count = max(2, max_turns - 2)
        older_turns = history[:-retain_count]
        recent_turns = history[-retain_count:]

        summary_points = []
        for turn in older_turns:
            role = str(turn.get("role", "user")).upper()
            content = str(turn.get("content", "")).strip()
            if content:
                snippet = content[:90] + ("..." if len(content) > 90 else "")
                summary_points.append(f"{role}: {snippet}")

        compressed_node = {
            "role": "system",
            "content": f"[COMPRESSED HISTORICAL CONTEXT]: " + " | ".join(summary_points)
        }
        return [compressed_node] + recent_turns

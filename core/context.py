import datetime
import platform

class TemporalContext:
    """
    Dynamically injects real-time temporal and system metrics
    into NAVI's prompt so it always knows the exact date, time, and system state.
    """

    @staticmethod
    def get_context_block() -> str:
        now = datetime.datetime.now()
        local_time_str = now.strftime("%Y-%m-%d %H:%M:%S")
        day_of_week = now.strftime("%A")
        timezone = datetime.datetime.now(datetime.timezone.utc).astimezone().tzname()

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

        return (
            f"[SYSTEM TEMPORAL & HARDWARE CONTEXT]\n"
            f"- Current Date: {now.strftime('%B %d, %Y')}\n"
            f"- Current Day: {day_of_week}\n"
            f"- Current Local Time: {local_time_str} ({timezone})\n"
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

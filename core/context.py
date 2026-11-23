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

        return (
            f"[SYSTEM TEMPORAL & HARDWARE CONTEXT]\n"
            f"- Current Date: {now.strftime('%B %d, %Y')}\n"
            f"- Current Day: {day_of_week}\n"
            f"- Current Local Time: {local_time_str} ({timezone})\n"
            f"- Host OS: {platform.system()} {platform.release()}\n"
            f"{metrics}"
            f"--------------------------------------------------"
        )


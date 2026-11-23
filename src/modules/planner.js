// =============================================================
// JARVIS AUTONOMOUS TASK PLANNER & EXECUTION RUNTIME
// =============================================================

export class JarvisTaskPlanner {
  constructor(invokeFn, showFeedbackFn) {
    this.invoke = invokeFn;
    this.showFeedback = showFeedbackFn;
    this.activePipeline = [];
    this.isExecuting = false;
  }

  decomposePrompt(prompt) {
    const clean = (prompt || "").trim();
    if (!clean) return [];

    // Split compound directives
    const splitters = /\band\s+then\b|\bthen\b|\bafter\s+that\b|\bnext\b|,\s*and\b/i;
    const parts = clean.split(splitters).map(p => p.trim()).filter(Boolean);

    return parts.map((part, idx) => {
      let action = "run_cmd";
      let target = part;
      const lower = part.toLowerCase();

      if (/^(open|launch|start)\s+/i.test(part)) {
        action = "open_app";
        target = part.replace(/^(open|launch|start)\s+/i, "").trim();
      } else if (/^(close|terminate|kill|stop)\s+/i.test(part)) {
        action = "close_app";
        target = part.replace(/^(close|terminate|kill|stop)\s+/i, "").trim();
      } else if (/^(search(\s+for)?|google)\s+/i.test(part)) {
        action = "web_search";
        target = part.replace(/^(search(\s+for)?|google)\s+/i, "").trim();
      } else if (lower.includes("lock") || lower.includes("mute") || lower.includes("volume")) {
        action = "system_ctrl";
        target = part;
      }

      return {
        step_id: idx + 1,
        action,
        target,
        description: part,
      };
    });
  }

  async executePipeline(steps) {
    if (!steps || !steps.length) return [];
    this.isExecuting = true;
    this.activePipeline = steps;

    try {
      if (typeof this.invoke === "function") {
        const results = await this.invoke("execute_task_pipeline", { steps });
        if (typeof this.showFeedback === "function") {
          const successCount = results.filter(r => r.success).length;
          this.showFeedback(`Completed ${successCount}/${steps.length} sequential operations, sir.`, "planner_complete");
        }
        return results;
      }
    } catch (err) {
      console.warn("[Task Planner] Execution error:", err);
      if (typeof this.showFeedback === "function") {
        this.showFeedback(`Pipeline failed: ${err}`, "planner_error");
      }
    } finally {
      this.isExecuting = false;
    }
    return [];
  }
}

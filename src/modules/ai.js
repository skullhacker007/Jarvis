// =============================================================
// JARVIS QUEEN NEURAL AI & STREAMING ENGINE
// =============================================================

export class JarvisNeuralClient {
  constructor(invokeFn) {
    this.invoke = invokeFn;
    this.isStreaming = false;
    this.streamBuffer = "";
    this.tokenCallbacks = new Set();
    this.wakeWordCallbacks = new Set();
    this.streamEndCallbacks = new Set();
    this.initEventListeners();
  }

  async initEventListeners() {
    try {
      const listener = window.__TAURI__?.event?.listen || window.__TAURI_INTERNALS__?.listen;
      if (!listener) return;

      await listener("jarvis://stream_token", (event) => {
        const token = event.payload;
        if (typeof token === "string") {
          this.isStreaming = true;
          this.streamBuffer += token;
          for (const cb of this.tokenCallbacks) {
            try { cb(token, this.streamBuffer); } catch (e) {}
          }
        }
      });

      await listener("jarvis://stream_end", () => {
        this.isStreaming = false;
        for (const cb of this.streamEndCallbacks) {
          try { cb(this.streamBuffer); } catch (e) {}
        }
        this.streamBuffer = "";
      });

      await listener("jarvis://wake_word", (event) => {
        for (const cb of this.wakeWordCallbacks) {
          try { cb(event.payload); } catch (e) {}
        }
      });
    } catch (err) {
      console.warn("[Neural AI] Event listener initialization notice:", err);
    }
  }

  onToken(cb) {
    this.tokenCallbacks.add(cb);
    return () => this.tokenCallbacks.delete(cb);
  }

  onStreamEnd(cb) {
    this.streamEndCallbacks.add(cb);
    return () => this.streamEndCallbacks.delete(cb);
  }

  onWakeWord(cb) {
    this.wakeWordCallbacks.add(cb);
    return () => this.wakeWordCallbacks.delete(cb);
  }

  async queryQueen(prompt) {
    this.streamBuffer = "";
    if (typeof this.invoke !== "function") {
      throw new Error("Invoke function unavailable");
    }
    return await this.invoke("ask_jarvis", { prompt });
  }

  async pullModel(modelName) {
    if (typeof this.invoke !== "function") {
      throw new Error("Invoke function unavailable");
    }
    return await this.invoke("pull_ollama_model", { modelName });
  }
}

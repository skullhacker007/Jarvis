async function runBenchmark() {
  const systemPrompt = `You are J.A.R.V.I.S., Stark Industries AI controller on Windows.
Reply ONLY with a single JSON object:
{"action":"open_app"|"close_app"|"run_cmd"|"system_ctrl"|"none","target":"<app or cmd>","reply":"<spoken reply under 12 words>"}
Rules:
- Execute ONLY the single specific job requested.
- Target mapping: "vs code"/"vscode"->"code", "notepad"->"notepad", "calculator"/"calc"->"calc", "chrome"->"chrome", "terminal"->"wt".
- Do not output markdown, reasoning, or text outside JSON.`;

  const tests = [
    "open notepad",
    "open vs code",
    "close notepad",
    "what is your status"
  ];

  for (const q of tests) {
    const t0 = Date.now();
    const res = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3.5:2b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: q }
        ],
        think: false,
        options: {
          temperature: 0.0,
          num_predict: 45,
          num_thread: 10
        },
        keep_alive: "24h",
        stream: false
      })
    });
    const data = await res.json();
    const elapsed = Date.now() - t0;
    console.log(`[${elapsed}ms] "${q}" => ${data.message?.content}`);
  }
}

runBenchmark();

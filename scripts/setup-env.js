import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const venvDir = path.join(rootDir, ".venv");
const venvPython = isWin
  ? path.join(venvDir, "Scripts", "python.exe")
  : path.join(venvDir, "bin", "python");
const reqFile = path.join(rootDir, "requirements.txt");

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: rootDir, stdio: "inherit", shell: false });
  return res.status === 0;
}

function hasCommand(cmd, args = ["--version"]) {
  const res = spawnSync(cmd, args, { cwd: rootDir, stdio: "ignore", shell: false });
  return res.status === 0;
}

if (existsSync(venvPython)) {
  // Quick sanity check that core packages are importable
  const ok = run(venvPython, ["-c", "import pipecat, kokoro_onnx, aiohttp"]);
  if (ok) {
    console.log("[NAVI Env] Project .venv is ready.");
    process.exit(0);
  }
}

console.log("[NAVI Env] Setting up project-local .venv...");
if (hasCommand("uv")) {
  if (!existsSync(venvPython)) {
    if (!run("uv", ["venv", ".venv", "--python", "3.14"])) {
      if (!run("uv", ["venv", ".venv"])) {
        console.error("[NAVI Env] Failed to create .venv with uv.");
        process.exit(1);
      }
    }
  }
  if (!run("uv", ["pip", "install", "--python", venvPython, "-r", reqFile])) {
    console.error("[NAVI Env] Failed to install requirements with uv.");
    process.exit(1);
  }
  console.log("[NAVI Env] .venv synchronized via uv.");
  process.exit(0);
}

// Fallback to standard python venv + pip if uv is not installed
const pyCmd = isWin && hasCommand("py", ["-3.14", "--version"]) ? "py" : "python";
const pyArgs = pyCmd === "py" ? ["-3.14"] : [];
if (!existsSync(venvPython)) {
  if (!run(pyCmd, [...pyArgs, "-m", "venv", ".venv"])) {
    console.error("[NAVI Env] Failed to create .venv.");
    process.exit(1);
  }
}
if (!run(venvPython, ["-m", "pip", "install", "-r", reqFile])) {
  console.error("[NAVI Env] Failed to install requirements via pip.");
  process.exit(1);
}
console.log("[NAVI Env] .venv synchronized.");

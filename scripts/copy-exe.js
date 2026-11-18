import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'jarvis.exe');
const destExe = path.join(rootDir, 'Jarvis.exe');

if (!fs.existsSync(srcExe)) {
  console.error(`[build:exe] Error: Executable not found at ${srcExe}`);
  process.exit(1);
}

try {
  fs.copyFileSync(srcExe, destExe);
} catch (err) {
  if (err.code === 'EBUSY') {
    console.log('[build:exe] Jarvis.exe is currently running. Closing running process to replace binary...');
    try {
      execSync('taskkill /f /im Jarvis.exe /im jarvis.exe', { stdio: 'ignore' });
    } catch {}
    execSync('powershell -Command "Start-Sleep -Milliseconds 500"');
    fs.copyFileSync(srcExe, destExe);
  } else {
    throw err;
  }
}

console.log(`\n========================================`);
console.log(`  J.A.R.V.I.S. Build Complete!`);
console.log(`  Executable created: ${destExe}`);
console.log(`========================================\n`);

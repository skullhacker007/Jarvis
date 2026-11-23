// =============================================================
// JARVIS SYSTEM & PHONE TELEMETRY ENGINE
// =============================================================

export async function fetchSystemTelemetry(invokeFn) {
  if (typeof invokeFn !== "function") return null;
  try {
    return await invokeFn("get_system_telemetry");
  } catch (err) {
    console.warn("[Telemetry] Failed to fetch system telemetry:", err);
    return null;
  }
}

export async function fetchPhoneTelemetry(invokeFn) {
  if (typeof invokeFn !== "function") return null;
  try {
    return await invokeFn("get_phone_telemetry");
  } catch (err) {
    return null;
  }
}

export function formatBytesToGb(bytes) {
  if (!bytes || isNaN(bytes)) return "0.0";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

export function formatNetworkRate(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return "0.0 KB/s";
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

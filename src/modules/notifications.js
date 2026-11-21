// =============================================================
// J.A.R.V.I.S. HUD NOTIFICATION TOAST ENGINE & PHONE MIRRORING
// =============================================================

import { JarvisSoundscape } from "./soundscape.js";

const seenNotifications = new Set();
let toastContainer = null;
let pollInterval = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById("hud-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "hud-toast-container";
      toastContainer.id = "hud-toast-container";
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

export function showToast(title, message, appName = "SYSTEM", icon = "⚡", duration = 5000) {
  const container = getToastContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "hud-toast";

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  toast.innerHTML = `
    <div class="hud-toast-icon">${icon}</div>
    <div class="hud-toast-content">
      <div class="hud-toast-header">
        <span class="hud-toast-app">${appName}</span>
        <span class="hud-toast-time">${timeStr}</span>
      </div>
      <div class="hud-toast-title">${title}</div>
      ${message ? `<div class="hud-toast-msg">${message}</div>` : ""}
    </div>
  `;

  container.appendChild(toast);
  JarvisSoundscape.play("alert");

  const removeTimer = setTimeout(() => {
    toast.classList.add("fading-out");
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 350);
  }, duration);

  toast.addEventListener("click", () => {
    clearTimeout(removeTimer);
    toast.classList.add("fading-out");
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 200);
  });
}

function getAppMeta(pkg) {
  const p = (pkg || "").toLowerCase();
  if (p.includes("whatsapp")) return { name: "WhatsApp", icon: "💬" };
  if (p.includes("telegram")) return { name: "Telegram", icon: "✈️" };
  if (p.includes("discord")) return { name: "Discord", icon: "🎮" };
  if (p.includes("slack")) return { name: "Slack", icon: "💼" };
  if (p.includes("gmail") || p.includes("mail")) return { name: "Mail", icon: "✉️" };
  if (p.includes("dialer") || p.includes("phone")) return { name: "Call", icon: "📞" };
  if (p.includes("mms") || p.includes("sms") || p.includes("message")) return { name: "Messages", icon: "📩" };
  if (p.includes("calendar")) return { name: "Calendar", icon: "📅" };
  if (p.includes("instagram")) return { name: "Instagram", icon: "📷" };
  if (p.includes("youtube")) return { name: "YouTube", icon: "▶️" };
  if (p.includes("spotify")) return { name: "Spotify", icon: "🎵" };
  return { name: pkg.split(".").pop() || "PHONE", icon: "📱" };
}

export function startPhoneNotificationSync(invokeFn) {
  if (pollInterval) return;

  const checkNotifications = async () => {
    try {
      if (typeof invokeFn !== "function") return;
      const notifs = await invokeFn("get_phone_notifications");
      if (Array.isArray(notifs) && notifs.length > 0) {
        for (const item of notifs) {
          const key = `${item.package}|${item.title}|${item.text}`;
          if (!seenNotifications.has(key)) {
            seenNotifications.add(key);
            // Cap seen set to prevent unbounded growth
            if (seenNotifications.size > 200) {
              const firstKey = seenNotifications.values().next().value;
              seenNotifications.delete(firstKey);
            }
            const meta = getAppMeta(item.package);
            showToast(item.title || "Phone Notification", item.text || "", meta.name, meta.icon, 6000);
          }
        }
      }
    } catch (e) {
      // ADB notification query passive catch
    }
  };

  // Initial check after 3s delay
  setTimeout(checkNotifications, 3000);
  pollInterval = setInterval(checkNotifications, 4500);
}

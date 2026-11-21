// =============================================================
// J.A.R.V.I.S. HOLOGRAPHIC PHONE DIALER & COMMUNICATIONS
// =============================================================

import { JarvisSoundscape } from "./soundscape.js";
import { showToast } from "./notifications.js";

export const JarvisDialer = {
  currentNumber: "",
  activeCall: null,

  async dial(number, invokeFn) {
    const clean = (number || "").trim();
    if (!clean) return { success: false, error: "Number is empty" };

    JarvisSoundscape.play("confirm");
    try {
      if (typeof invokeFn === "function") {
        const res = await invokeFn("dial_phone_call", { number: clean });
        this.activeCall = { number: clean, startTime: Date.now() };
        showToast(`Dialing ${clean}`, "Uplink established via ADB / Wi-Fi", "PHONE", "📞");
        return { success: true, result: res };
      }
    } catch (err) {
      showToast("Call Failed", String(err), "PHONE", "⚠️");
      return { success: false, error: err };
    }
  },

  async endCall(invokeFn) {
    JarvisSoundscape.play("undo");
    try {
      if (typeof invokeFn === "function") {
        await invokeFn("end_phone_call");
      }
      this.activeCall = null;
      showToast("Call Terminated", "Channel closed", "PHONE", "📞");
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  appendDigit(digit) {
    JarvisSoundscape.play("click");
    this.currentNumber += digit;
    return this.currentNumber;
  },

  backspace() {
    JarvisSoundscape.play("click");
    this.currentNumber = this.currentNumber.slice(0, -1);
    return this.currentNumber;
  },

  clear() {
    this.currentNumber = "";
    return this.currentNumber;
  }
};

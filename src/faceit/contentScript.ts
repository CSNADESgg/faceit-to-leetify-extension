import { AUTO_UPLOAD_STORAGE_KEY } from "../storage";
import { FaceitToLeetifyLoadEventPayload } from "./window";

console.log("Loaded FACEIT to Leetify extension for FACEIT injection");

(async () => {
  // Page <-> extension proxy
  window.addEventListener("message", async (event) => {
    if (event.data && event.data.type == "fromPage") {
      const response = await chrome.runtime.sendMessage(event.data.payload);
      window.postMessage({ type: "fromExtension", payload: response });
    }
  });

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    await new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    });
  }

  // Dispatch load event for the injected web.js script
  const { [AUTO_UPLOAD_STORAGE_KEY]: autoUpload } =
    await chrome.storage.local.get(AUTO_UPLOAD_STORAGE_KEY);

  document.dispatchEvent(
    new CustomEvent("faceitToLeetify__load", {
      detail: {
        autoUpload,
      } satisfies FaceitToLeetifyLoadEventPayload,
    }),
  );
})();

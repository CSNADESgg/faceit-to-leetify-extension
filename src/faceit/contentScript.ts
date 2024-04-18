import { AUTO_UPLOAD_STORAGE_KEY } from "../storage";
import { FaceitToLeetifyLoadEventPayload } from "./window";

console.log("Loaded FACEIT to Leetify extension for FACEIT injection");

(() => {
  // Page <-> extension proxy
  window.addEventListener("message", async (event) => {
    if (event.data && event.data.type == "fromPage") {
      const response = await chrome.runtime.sendMessage(event.data.payload);
      window.postMessage({ type: "fromExtension", payload: response });
    }
  });

  // Inject script into the main web context
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", chrome.runtime.getURL("faceit/web.js"));

  script.onload = async () => {
    const { [AUTO_UPLOAD_STORAGE_KEY]: autoUpload } =
      await chrome.storage.local.get(AUTO_UPLOAD_STORAGE_KEY);

    document.dispatchEvent(
      new CustomEvent("faceitToLeetify__load", {
        detail: {
          autoUpload,
        } satisfies FaceitToLeetifyLoadEventPayload,
      }),
    );
  };

  document.body.appendChild(script);
})();

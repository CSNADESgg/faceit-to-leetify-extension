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

  script.onload = () => {
    // Inject extension ID since we're in the web page's context
    // and it's require for sending messages to the extension
    const storeEvent = new CustomEvent("faceitToLeetify__extId", {
      detail: chrome.runtime.id,
    });
    document.dispatchEvent(storeEvent);
  };

  document.body.appendChild(script);
})();

import { ServiceWorkerMessage, ServiceWorkerMessageType } from "../../messages";
import { LEETIFY_FRONTEND_URL } from "../../constants";

console.log("Loaded FACEIT to Leetify extension for Leetify authentication");

(async () => {
  if (location.toString() !== `${LEETIFY_FRONTEND_URL}/gcpd-extension-auth`) {
    return;
  }

  // Send access_token to service worker
  await chrome.runtime.sendMessage({
    type: ServiceWorkerMessageType.LEETIFY_AUTH_TOKEN,
    payload: {
      authToken: localStorage.getItem("access_token") ?? undefined,
    },
  } satisfies ServiceWorkerMessage);

  close();
})();

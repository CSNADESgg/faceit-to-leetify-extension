import { LEETIFY_FRONTEND_URL } from "../../constants";
import { Browser, currentBrowser } from "../../browser";
import { defer } from "../../helpers";

let leetifyAuthTokenPromise: ReturnType<typeof defer<string | undefined>>;

export async function getLeetifyAuthToken() {
  leetifyAuthTokenPromise = defer();

  let close: () => Promise<void>;

  switch (currentBrowser) {
    case Browser.Chrome:
      if (await chrome.offscreen.hasDocument()) {
        try {
          await chrome.offscreen.closeDocument();
        } catch (error) {
          console.warn(
            "Could not close offscreen document before authenticating",
            error,
          );
        }
      }

      // Create authentication iframe which has content script to extract token
      await chrome.offscreen.createDocument({
        justification: "Authenticate with Leetify",
        reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
        url: "public/leetify-auth.html",
      });

      close = async () => {
        try {
          await chrome.offscreen.closeDocument();
        } catch (error) {
          console.warn("Could not close offscreen document", error);
        }
      };
      break;
    case Browser.Firefox:
      // Create authentication tab which has content script to extract token
      const tab = await chrome.tabs.create({
        url: `${LEETIFY_FRONTEND_URL}/gcpd-extension-auth`,
        active: false,
      });

      close = async () => {
        try {
          await chrome.tabs.remove(tab.id!);
        } catch (error) {
          console.warn("Could not close tab", error, tab);
        }
      };
      break;
  }

  // Error after 10s
  const timeout = setTimeout(async () => {
    await close();
    leetifyAuthTokenPromise.reject(
      new Error("Getting Leetify auth token took too long"),
    );
  }, 10_000);

  // Wait for token to be fetched and cleanup
  try {
    const leetifyAccessToken = await leetifyAuthTokenPromise;
    clearTimeout(timeout);

    return leetifyAccessToken;
  } finally {
    await close();
  }
}

export function setLeetifyAuthToken(authToken?: string) {
  leetifyAuthTokenPromise.resolve(authToken);
}

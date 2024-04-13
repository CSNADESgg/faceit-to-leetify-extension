import { LEETIFY_FRONTEND_URL } from "../../constants";
import { Browser, currentBrowser } from "../../browser";
import { defer } from "../../helpers";

let leetifyAuthTokenPromise: ReturnType<typeof defer<string | undefined>>;

export async function getLeetifyAuthToken() {
  leetifyAuthTokenPromise = defer();

  let close: () => Promise<void>;

  switch (currentBrowser) {
    case Browser.Chrome:
      // Create authentication iframe which has content script to extract token
      await chrome.offscreen.createDocument({
        justification: "Authenticate with Leetify",
        reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
        url: "public/leetify-auth.html",
      });

      close = async () => {
        await chrome.offscreen.closeDocument();
      };
    case Browser.Firefox:
      // Create authentication tab which has content script to extract token
      const tab = await chrome.tabs.create({
        url: `${LEETIFY_FRONTEND_URL}/gcpd-extension-auth`,
        active: false,
      });

      close = async () => {
        await chrome.tabs.remove(tab.id!);
      };
  }

  // Error after 10s
  const timeout = setTimeout(async () => {
    await close();
    leetifyAuthTokenPromise.reject(
      new Error("Getting Leetify auth token took too long"),
    );
  }, 10_000);

  // Wait for token to be fetched and cleanup
  const leetifyAccessToken = await leetifyAuthTokenPromise;
  clearTimeout(timeout);
  await close();

  return leetifyAccessToken;
}

export function setLeetifyAuthToken(authToken?: string) {
  leetifyAuthTokenPromise.resolve(authToken);
}

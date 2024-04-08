import { defer } from "../../helpers";

let leetifyAuthTokenPromise: ReturnType<typeof defer<string | undefined>>;

export async function getLeetifyAuthToken() {
  leetifyAuthTokenPromise = defer();

  // Create authentication iframe which has content script to extract token
  await chrome.offscreen.createDocument({
    justification: "Authenticate with Leetify",
    reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
    url: "public/leetify-auth.html",
  });

  // Error after 10s
  const timeout = setTimeout(async () => {
    await chrome.offscreen.closeDocument();
    leetifyAuthTokenPromise.reject(
      new Error("Getting Leetify auth token took too long"),
    );
  }, 10_000);

  // Wait for token to be fetched and cleanup
  const leetifyAccessToken = await leetifyAuthTokenPromise;
  clearTimeout(timeout);
  await chrome.offscreen.closeDocument();

  return leetifyAccessToken;
}

export function setLeetifyAuthToken(authToken?: string) {
  leetifyAuthTokenPromise.resolve(authToken);
}

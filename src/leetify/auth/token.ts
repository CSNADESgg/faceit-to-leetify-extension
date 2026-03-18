import { LEETIFY_FRONTEND_URL } from "../../constants";
import { Browser, currentBrowser } from "../../browser";
import { defer } from "../../helpers";

let leetifyAuthTokenPromise: ReturnType<typeof defer<string | undefined>>;

/**
 * Check whether an offscreen document already exists using
 * runtime.getContexts() (stable, works across Chromium forks including
 * Vivaldi) with a fallback to the older hasDocument() API.
 */
async function hasOffscreenDocument(): Promise<boolean> {
  // Prefer runtime.getContexts, it's the officially recommended approach
  // and avoids the reliability issues hasDocument() has on some Chromium forks.
  if ("getContexts" in chrome.runtime) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: [
          "OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType,
        ],
      });
      return contexts.length > 0;
    } catch (error) {
      console.warn("runtime.getContexts() failed, falling back", error);
    }
  }

  // Fallback for older Chromium versions
  if (chrome.offscreen?.hasDocument) {
    try {
      return await chrome.offscreen.hasDocument();
    } catch (error) {
      console.warn("offscreen.hasDocument() failed", error);
    }
  }

  return false;
}

/**
 * Safely close the current offscreen document, ignoring errors if it's
 * already gone (e.g. torn down by the browser between our check and close).
 */
async function closeOffscreenDocument(): Promise<void> {
  try {
    if (await hasOffscreenDocument()) {
      await chrome.offscreen.closeDocument();
    }
  } catch (error) {
    // "No current offscreen document" is fine, it was already closed.
    console.warn(
      "Could not close offscreen document (may already be closed)",
      error,
    );
  }
}

/**
 * Create the offscreen document, guarding against the race where a
 * previous document still exists or is mid-creation.
 */
let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  // If another call is already creating the document, wait for it.
  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  // Close any stale document first
  await closeOffscreenDocument();

  try {
    creatingOffscreen = chrome.offscreen.createDocument({
      justification: "Authenticate with Leetify",
      reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
      url: "public/leetify-auth.html",
    });
    await creatingOffscreen;
  } catch (error: unknown) {
    // "Only a single offscreen document may be created" means one already
    // exists, that's fine for our purposes.
    const msg = String(error);
    if (!msg.includes("single offscreen") && !msg.includes("already")) {
      throw error;
    }
    console.warn(
      "Offscreen document already existed despite our check",
      error,
    );
  } finally {
    creatingOffscreen = null;
  }
}

/**
 * Open a background tab to the Leetify auth page and return a cleanup function.
 */
async function openAuthTab(): Promise<() => Promise<void>> {
  const tab = await chrome.tabs.create({
    url: `${LEETIFY_FRONTEND_URL}/gcpd-extension-auth`,
    active: false,
  });

  return async () => {
    try {
      await chrome.tabs.remove(tab.id!);
    } catch (error) {
      console.warn("Could not close tab", error, tab);
    }
  };
}

export async function getLeetifyAuthToken() {
  leetifyAuthTokenPromise = defer();

  let close: () => Promise<void>;

  switch (currentBrowser) {
    case Browser.Chrome: {
      await ensureOffscreenDocument();
      close = closeOffscreenDocument;

      // Some Chromium forks (e.g. Vivaldi) create the offscreen document
      // successfully but content scripts don't run inside its iframe.
      // Fall back to a background tab if no token arrives within 5 seconds.
      const fallbackTimeout = setTimeout(async () => {
        console.warn(
          "Offscreen auth did not respond in time, falling back to tab",
        );
        await closeOffscreenDocument();
        close = await openAuthTab();
      }, 5_000);

      // Clear the fallback timer once we have a result (success or failure)
      leetifyAuthTokenPromise.then(
        () => clearTimeout(fallbackTimeout),
        () => clearTimeout(fallbackTimeout),
      );
      break;
    }
    case Browser.Firefox:
      close = await openAuthTab();
      break;
  }

  // Error after 15s (gives time for offscreen + tab fallback)
  const timeout = setTimeout(async () => {
    await close();
    leetifyAuthTokenPromise.reject(
      new Error("Getting Leetify auth token took too long"),
    );
  }, 15_000);

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

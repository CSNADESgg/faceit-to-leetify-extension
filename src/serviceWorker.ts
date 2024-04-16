import {
  FaceitErrors,
  ServiceWorkerMessage,
  ServiceWorkerMessageType,
} from "./messages";
import { FACEIT_ORIGINS, LEETIFY_FRONTEND_URL } from "./constants";
import { getLeetifyAuthToken, setLeetifyAuthToken } from "./leetify/auth/token";
import { getProcessedDemos } from "./helpers";
import {
  INTRO_SHOWN_STORAGE_KEY,
  PROCESSED_MATCHES_STORAGE_KEY,
} from "./storage";

console.log("Loaded FACEIT to Leetify service worker");

async function onMessage(
  request: ServiceWorkerMessage,
  sender: chrome.runtime.MessageSender,
) {
  try {
    switch (request.type) {
      // Send a FACEIT demo URL to Leetify
      case ServiceWorkerMessageType.SEND_TO_LEETIFY: {
        if (!FACEIT_ORIGINS.includes(new URL(sender.url ?? "").origin)) {
          throw new Error("SENT_TO_LEETIFY was not called from FACEIT origin");
        }

        console.log("Getting Leetify auth token");
        const leetifyAuthToken = await getLeetifyAuthToken();
        if (!leetifyAuthToken) {
          console.log("No Leetify token returned, user is not logged in");
          return {
            error: FaceitErrors.NOT_LOGGED_IN_TO_LEETIFY,
          };
        }

        console.log(
          `Got Leetify auth token. Posting URL to Leetify: ${request.payload.url}`,
        );
        const leetifyResponse = await fetch(
          "https://api.leetify.com/api/faceit-demos/submit-demo-download-url",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${leetifyAuthToken}`,
            },
            body: JSON.stringify({
              url: request.payload.url,
            }),
          },
        );
        if (!leetifyResponse.ok) {
          console.error(
            "Could not submit demo to Leetify",
            await leetifyResponse.text(),
          );
          return {
            error: FaceitErrors.LEETIFY_NO_MATCH_ID,
          };
        }

        const leetifyData = (await leetifyResponse.json()) as { id: string };

        if (!leetifyData.id) {
          console.error("Leetify returned no match ID");
          return {
            error: FaceitErrors.LEETIFY_NO_MATCH_ID,
          };
        }

        console.log(
          `Posted to Leetify, returned Leetify match ID: ${leetifyData.id}`,
        );

        const faceitId = request.payload.faceitId;
        const leetifyId = leetifyData.id;

        // Add to processed matches if doesn't exists
        const processedMatches = await getProcessedDemos();
        if (
          !processedMatches.some(
            (match) =>
              match.leetifyId === leetifyId || match.faceitId === faceitId,
          )
        ) {
          processedMatches.push({
            leetifyId,
            faceitId,
            timestamp: Date.now(),
            isOldDemo: request.payload.isOldDemo || undefined,
          });

          await chrome.storage.local.set({
            [PROCESSED_MATCHES_STORAGE_KEY]: processedMatches,
          });
        }

        return { id: leetifyId };
      }
      // Returns if a match has already been processed
      case ServiceWorkerMessageType.GET_PROCESSED_DEMO: {
        if (!FACEIT_ORIGINS.includes(new URL(sender.url ?? "").origin)) {
          throw new Error(
            "GET_PROCESSED_DEMO was not called from FACEIT origin",
          );
        }

        const processedDemos = await getProcessedDemos();

        if (!processedDemos) {
          return undefined;
        }

        const filteredDemo = processedDemos.find(
          (demo) =>
            ("faceitId" in request.payload &&
              demo.faceitId === request.payload.faceitId) ||
            ("leetifyId" in request.payload &&
              demo.leetifyId === request.payload.leetifyId),
        );

        return filteredDemo;
      }
      // Sets the Leetify auth token
      case ServiceWorkerMessageType.LEETIFY_AUTH_TOKEN: {
        if (new URL(sender.url ?? "").origin !== LEETIFY_FRONTEND_URL) {
          throw new Error(
            "LEETIFY_AUTH_TOKEN was not called from Leetify front-end origin",
          );
        }

        setLeetifyAuthToken(request.payload.authToken);
        break;
      }
    }
  } catch (error) {
    console.error(error);
    return { error: String(error) };
  }
}

// Handles communication with FACEIT/Leetify
chrome.runtime.onMessage.addListener(
  (request: ServiceWorkerMessage, sender, sendResponse) => {
    onMessage(request, sender).then(sendResponse);
    return true;
  },
);

// Show intro tab
chrome.runtime.onInstalled.addListener(async () => {
  // Only show once
  const { [INTRO_SHOWN_STORAGE_KEY]: introShown } =
    (await chrome.storage.local.get(INTRO_SHOWN_STORAGE_KEY)) as {
      [INTRO_SHOWN_STORAGE_KEY]?: true;
    };
  if (introShown) {
    return;
  }
  await chrome.storage.local.set({ [INTRO_SHOWN_STORAGE_KEY]: true });

  await chrome.tabs.create({ url: chrome.runtime.getURL("public/intro.html") });
});

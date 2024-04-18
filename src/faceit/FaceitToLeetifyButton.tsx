import useTurnstileCaptcha from "./useTurnstile";
import React, { useEffect, useState } from "react";
import {
  FaceitErrors,
  ServiceWorkerMessage,
  ServiceWorkerMessageType,
} from "../messages";
import { global } from "./global";
import FaceitToast from "./FaceitToast";
import clsx from "clsx";
import { LEETIFY_PROCESS_LIMIT, LEETIFY_OLD_DEMO_WARNING } from "../constants";
import WarningIcon from "../components/WarningIcon";
import { ProcessedMatch } from "../storage";
import { sendMessage } from "../helpers";

// Get match ID from URL
function getFaceitMatchId() {
  const regex = /https:\/\/(?:www\.)?faceit\.com\/.+\/cs.+\/room\/([^?/]*)/;
  const match = regex.exec(location.href);
  const id = match?.[1];
  if (!id) {
    throw new Error("Could not get FACEIT match ID from URL");
  }

  return id;
}

function getLeetifyRedirectUrl(leetifyId: string, isOldDemo?: boolean) {
  const queryParams = new URLSearchParams({
    "faceit-to-leetify": "done",
  });
  if (isOldDemo) {
    queryParams.set("faceit-to-leetify-is-old", "true");
  }

  return `https://leetify.com/app/match-details/${leetifyId}/overview?${queryParams}`;
}

export default function FaceitToLeetifyButton() {
  const { component: Captcha, getToken } = useTurnstileCaptcha("leetify");

  const automaticallyUpload = !!global.automatic;
  const [leetifyId, setLeetifyId] = useState<string>();
  const [loading, setLoading] = useState(automaticallyUpload);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [isOldDemo, setIsOldDemo] = useState(false);

  async function handleClick() {
    const id = getFaceitMatchId();

    setLoading(true);
    setError(undefined);

    try {
      console.log(`Getting match details for: ${id}`);
      const faceitMatchDetailsResponse = await fetch(
        `https://www.faceit.com/api/match/v2/match/${id}`,
      );
      if (!faceitMatchDetailsResponse.ok) {
        setError("Could not get FACEIT match details. Is FACEIT down?");
        console.error(
          "FACEIT match details response:",
          await faceitMatchDetailsResponse.text(),
        );
        return;
      }
      const faceitMatchDetails = await faceitMatchDetailsResponse.json();

      // Find if match is older than Leetify supports
      const matchFinishedAt = new Date(
        faceitMatchDetails.payload.finishedAt,
      ).getTime();
      let isOldDemo = Date.now() - matchFinishedAt > LEETIFY_PROCESS_LIMIT;

      if (isOldDemo) {
        setIsOldDemo(true);
        setWarning(LEETIFY_OLD_DEMO_WARNING);
      }

      // Get Demo URL
      if (faceitMatchDetails.payload.demoURLs.length !== 1) {
        setError(
          "More than 1 demo URL was found. This is not currently supported.",
        );
        return;
      }
      const demoUrl = faceitMatchDetails.payload.demoURLs[0];

      console.log(`Getting signed URL for: ${demoUrl}`);
      const faceitDemoResponse = await fetch(
        `https://www.faceit.com/api/download/v2/demos/download-url`,
        {
          method: "POST",
          body: JSON.stringify({
            resource_url: demoUrl,
            captcha_token: await getToken(),
          }),
        },
      );
      if (!faceitDemoResponse.ok) {
        setError("Could not get demo URL. Is FACEIT down?");
        console.error(
          "FACEIT demo URL response:",
          await faceitDemoResponse.text(),
        );
        return;
      }

      const faceitDemoData = await faceitDemoResponse.json();
      const url = faceitDemoData.payload.download_url;
      console.log(`Got signed URL: ${url}`);

      // Send to service worker
      const response: { error: string } | { id: string } = await sendMessage({
        type: ServiceWorkerMessageType.SEND_TO_LEETIFY,
        payload: { url, faceitId: id, isOldDemo },
      } satisfies ServiceWorkerMessage);

      if (!response || "error" in response) {
        if (!response) {
          setError("No response from extension");
          return;
        } else if (response.error === FaceitErrors.NOT_LOGGED_IN_TO_LEETIFY) {
          setError("Please log in to Leetify and refresh.");
          setShowLoginButton(true);
          return;
        } else if (response.error === FaceitErrors.LEETIFY_NO_MATCH_ID) {
          setError(
            "Leetify could not process this demo. This is not an issue with the extension.",
          );
          return;
        }
        throw new Error(response.error);
      }

      console.log(`Got Leetify match ID: ${response.id}`);
      // Redirect back to Leetify if was automatic
      if (automaticallyUpload) {
        location.href = getLeetifyRedirectUrl(response.id, isOldDemo);
        return;
      }

      setLeetifyId(response.id);
      if (!isOldDemo) {
        setShowToast(true);
      }
    } catch (error) {
      console.error(error);
      setError(error.toString());
    } finally {
      setLoading(false);
    }
  }

  // Wait for demo countdown to finish
  const [waitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [hasCountdown, setHasCountdown] = useState(false);
  useEffect(() => {
    function checkCountdown() {
      // Get the info panel of match page
      const parent = document.querySelector<HTMLDivElement>(
        "#parasite-container #MATCHROOM-OVERVIEW div[name=info]",
      );
      if (!parent) {
        return;
      }
      // Find "Watch demo" button
      const button = parent.querySelector(
        "div:first-child > div:first-child > button > span",
      )?.parentElement;
      if (!button) {
        return;
      }

      const hasCountdown = button.textContent?.includes(":") ?? false;
      setHasCountdown(hasCountdown);

      // Trigger upload if waiting for countdown to finish
      if (waitingForCountdown && !hasCountdown) {
        setIsWaitingForCountdown(false);
        handleClick();
      }
    }

    checkCountdown();

    const observer = new MutationObserver(checkCountdown);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [hasCountdown, waitingForCountdown]);

  useEffect(() => {
    if (global.autoUpload && hasCountdown) {
      setIsWaitingForCountdown(true);
    }
  }, [hasCountdown]);

  function handleOnReadyClick() {
    setIsWaitingForCountdown(true);
  }

  // Close toast automatically
  useEffect(() => {
    if (showToast) {
      const timeout = setTimeout(() => setShowToast(false), 5_000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [showToast]);

  // Auto-trigger if redirect from Leetify
  useEffect(() => {
    if (automaticallyUpload) {
      handleClick();
    }
  }, []);

  // Fetch extension storage to check if match has already been uploaded
  useEffect(() => {
    (async () => {
      const response: ProcessedMatch | undefined = await sendMessage({
        type: ServiceWorkerMessageType.GET_PROCESSED_DEMO,
        payload: { faceitId: getFaceitMatchId() },
      } satisfies ServiceWorkerMessage);

      if (!response) {
        return;
      }

      setLeetifyId(response.leetifyId);

      if ("isOldDemo" in response && response.isOldDemo) {
        setIsOldDemo(true);
        setWarning(LEETIFY_OLD_DEMO_WARNING);
      }
    })();
  }, []);

  return (
    <>
      {showLoginButton ? (
        <a
          className="bg-leetify drop-shadow-glow mb-3.5 mt-3 block h-8 w-full rounded px-6 py-2 font-bold text-white brightness-100 transition-all duration-100 hover:brightness-125"
          href="https://leetify.com/auth/login"
          target="_blank"
          rel="noreferrer"
        >
          LOG IN TO LEETIFY
        </a>
      ) : loading ? (
        <div className="bg-leetify drop-shadow-glow mb-3.5 mt-3 flex h-8 w-full items-center justify-center rounded">
          <svg
            aria-hidden="true"
            className="h-5 w-5 animate-spin fill-white text-gray-300/60"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
        </div>
      ) : hasCountdown ? (
        <>
          <button
            className={clsx(
              "bg-leetify drop-shadow-glow mb-3.5 mt-3 block h-8 w-full rounded border-0 px-6 py-2 font-bold text-white brightness-100 transition-all duration-100",
              !waitingForCountdown
                ? "hover:brightness-125"
                : "!cursor-progress",
            )}
            onClick={!waitingForCountdown ? handleOnReadyClick : undefined}
            disabled={waitingForCountdown}
          >
            {!waitingForCountdown
              ? "UPLOAD TO LEETIFY WHEN READY"
              : "WAITING FOR DEMO TO UPLOAD"}
          </button>
          {waitingForCountdown && (
            <p className="mb-5 text-center text-[13px] text-neutral-400">
              Stay on this page to upload when ready.
            </p>
          )}
        </>
      ) : !leetifyId ? (
        <button
          className="bg-leetify drop-shadow-glow mb-3.5 mt-3 block h-8 w-full rounded border-0 px-6 py-2 font-bold text-white brightness-100 transition-all duration-100 hover:brightness-125"
          onClick={handleClick}
        >
          UPLOAD TO LEETIFY
        </button>
      ) : (
        <a
          className="bg-leetify drop-shadow-glow mb-3.5 mt-3 flex h-8 w-full items-center justify-center gap-2 rounded px-6 py-2 font-bold text-white brightness-100 transition-all duration-100 hover:brightness-125"
          href={getLeetifyRedirectUrl(leetifyId, isOldDemo)}
          target="_blank"
          rel="noreferrer"
        >
          {isOldDemo && <WarningIcon />}
          VIEW ON LEETIFY
        </a>
      )}

      {error && <p className="mb-5 text-center text-red-400">{error}</p>}

      {warning && !loading && (
        <p className="mb-5 text-center text-yellow-500">{warning}</p>
      )}

      {showToast && (
        <FaceitToast>
          <div className="px-1.5 py-2 text-left">
            <h2 className="m-0 pb-2">Match is processing on Leetify</h2>
            <p className="m-0">This usually takes 2 to 15 minutes.</p>
          </div>
          <button
            className="w-8 rounded border-0 bg-transparent p-1 text-white/60 transition-colors hover:bg-[#484848]/80"
            onClick={() => setShowToast(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              width="24"
              className="sc-klVQfs hETIkZ"
            >
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"
                fill="currentColor"
              />
            </svg>
          </button>
        </FaceitToast>
      )}

      {automaticallyUpload && (
        <FaceitToast>
          <div className="px-1.5 py-2 text-left">
            <h2 className="m-0 pb-2">
              Match is being automatically uploaded to Leetify
            </h2>
            <p className="m-0">Please wait until you are redirected back.</p>
          </div>
        </FaceitToast>
      )}

      <Captcha />
    </>
  );
}

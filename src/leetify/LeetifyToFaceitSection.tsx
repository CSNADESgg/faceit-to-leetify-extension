import React, { useEffect, useState } from "react";
import LeetifyToFaceitDescription from "./LeetifyToFaceitDescription";
import LeetifyToFaceitButton from "./LeetifyToFaceitButton";
import { getLeetifyId } from "./contentScript";
import { getProcessedDemos } from "../helpers";
import { LEETIFY_OLD_DEMO_WARNING } from "../constants";

function isQueryParamDone() {
  return (
    new URLSearchParams(location.search).get("faceit-to-leetify") === "done"
  );
}
function isQueryParamOld() {
  return (
    new URLSearchParams(location.search).get("faceit-to-leetify-is-old") ===
    "true"
  );
}

export default function LeetifyToFaceitSection() {
  // If redirected back from FACEIT, match has started upload
  const [isProcessing, setIsProcessing] = useState(isQueryParamDone());
  const [isOldDemo, setIsOldDemo] = useState(isQueryParamOld());

  // Fetch to check if match already started upload
  useEffect(() => {
    if (isProcessing) {
      return;
    }

    (async () => {
      const processedDemos = await getProcessedDemos();
      if (!processedDemos) {
        return;
      }

      const leetifyId = getLeetifyId(location.href);

      const filteredDemo = processedDemos.find(
        (demo) => demo.leetifyId === leetifyId,
      );
      if (!filteredDemo) {
        return;
      }

      setIsProcessing(true);

      if ("isOldDemo" in filteredDemo && filteredDemo.isOldDemo) {
        setIsOldDemo(filteredDemo.isOldDemo);
      }
    })();
  }, []);

  // Remove done query param
  useEffect(() => {
    if (isQueryParamDone() || isQueryParamOld()) {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete("faceit-to-leetify");
      searchParams.delete("faceit-to-leetify-is-old");
      history.pushState(
        null,
        "",
        `${window.location.pathname}${searchParams.toString().length ? "?" + searchParams.toString() : ""}`,
      );
    }
  }, []);

  return (
    <div className="flex w-full flex-col items-center">
      {!isProcessing && (
        <LeetifyToFaceitDescription>
          <p className="mb-2">
            Click to automatically upload the FACEIT demo to Leetify.
            <br />
          </p>
          <p className="mb-1 italic">
            This action will automatically redirect you to the FACEIT page, then
            back to this page once the upload is started.
          </p>
        </LeetifyToFaceitDescription>
      )}
      <LeetifyToFaceitButton isDone={isProcessing} showWarning={isOldDemo} />
      {isOldDemo && (
        <p className="mb-3 mt-2 text-center text-yellow-500">
          {LEETIFY_OLD_DEMO_WARNING}
        </p>
      )}
      {isProcessing && !isOldDemo && (
        <LeetifyToFaceitDescription>
          <p className="mb-1">This usually takes 2 to 15 minutes.</p>
        </LeetifyToFaceitDescription>
      )}
    </div>
  );
}

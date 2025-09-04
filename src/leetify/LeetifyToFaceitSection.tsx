import React, { useEffect, useState } from "react";
import LeetifyToFaceitDescription from "./LeetifyToFaceitDescription";
import LeetifyToFaceitButton from "./LeetifyToFaceitButton";
import { getLeetifyId } from "./contentScript";
import { getProcessedDemos } from "../helpers";
import { LEETIFY_OLD_DEMO_WARNING } from "../constants";
import { global, isQueryParamDone, isQueryParamOld } from "./global";

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

  useEffect(() => {
    global.initialQueryParams = new URLSearchParams();
  }, []);

  return (
    <div className="csn:flex csn:w-full csn:flex-col csn:items-center">
      {!isProcessing && (
        <LeetifyToFaceitDescription>
          <p className="csn:mb-2">
            Click to automatically upload the FACEIT demo to Leetify.
            <br />
          </p>
          <p className="csn:mb-1 csn:italic">
            This action will automatically redirect you to the FACEIT page, then
            back to this page once the upload is started.
          </p>
        </LeetifyToFaceitDescription>
      )}
      <LeetifyToFaceitButton isDone={isProcessing} showWarning={isOldDemo} />
      {isOldDemo && (
        <p className="csn:mt-2 csn:mb-3 csn:text-center csn:text-yellow-500">
          {LEETIFY_OLD_DEMO_WARNING}
        </p>
      )}
      {isProcessing && !isOldDemo && (
        <LeetifyToFaceitDescription>
          <p className="csn:mt-2 csn:mb-1">
            This usually takes 2 to 15 minutes.
          </p>
        </LeetifyToFaceitDescription>
      )}
    </div>
  );
}

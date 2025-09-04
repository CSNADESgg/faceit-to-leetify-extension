import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { getProcessedDemos } from "../helpers";

export default function LeetifyToFaceitButton({ id }: { id: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    console.log(`Getting FACEIT match ID for Leetify match ${id}`);
    const response = await fetch(
      `https://api.leetify.com/api/games/${id}/external-match-id`,
    );
    if (!response.ok) {
      console.error(
        "Leetify external match ID response:",
        await response.text(),
      );
      throw new Error("Could not get FACEIT match ID from Leetify");
    }
    const faceitId = await response.json();

    console.log(`Got FACEIT match ID ${faceitId}, redirecting`);
    // Same flow as clicking on the button from match page
    open(
      `https://www.faceit.com/en/cs2/room/${faceitId}?faceit-to-leetify=auto`,
      "_blank",
    );
  }

  // Fetch to check if match already been upload
  useEffect(() => {
    (async () => {
      const processedDemos = await getProcessedDemos();
      if (!processedDemos) {
        return;
      }

      const filteredDemo = processedDemos.find((demo) => demo.leetifyId === id);
      if (!filteredDemo) {
        return;
      }

      setIsProcessing(true);
    })();
  }, []);

  return (
    <button
      className={clsx(
        "csn:mr-2 csn:block csn:h-8 csn:w-full csn:rounded-sm csn:border-0 csn:px-6 csn:py-2 csn:!text-xs csn:font-bold csn:text-white csn:brightness-100 csn:transition-all csn:duration-100",
        !isProcessing
          ? "csn:bg-leetify csn:hover:brightness-125"
          : "csn:bg-gray-500",
      )}
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? "PROCESSING" : "UPLOAD"}
    </button>
  );
}

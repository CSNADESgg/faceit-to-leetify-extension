import React from "react";
import WarningIcon from "../components/WarningIcon";
import clsx from "clsx";

interface LeetifyToFaceitButtonProps {
  isDone?: boolean;
  showWarning?: boolean;
}

export default function LeetifyToFaceitButton({
  isDone = false,
  showWarning = false,
}: LeetifyToFaceitButtonProps) {
  function handleClick() {
    const faceitLink = document.querySelector<HTMLAnchorElement>(
      "a[href*='https://www.faceit.com']",
    );
    if (!faceitLink) {
      throw new Error("Could not find FACEIT link");
    }

    // Redirect to FACEIT with query param, to indicate to the FACEIT part to
    // automatically start upload and to redirect back here
    location.href = faceitLink.href + "?faceit-to-leetify=auto";
  }

  return (
    <button
      className={clsx(
        "csn:mt-3 csn:mb-3.5 csn:flex csn:h-8 csn:w-full csn:items-center csn:justify-center csn:gap-2 csn:rounded-sm csn:border-0 csn:px-6 csn:py-2 csn:font-bold csn:text-white csn:brightness-100 csn:transition-all csn:duration-100",
        isDone
          ? "csn:bg-gray-500"
          : "csn:bg-leetify csn:drop-shadow-glow csn:hover:brightness-125",
      )}
      onClick={handleClick}
      disabled={isDone}
    >
      {showWarning && <WarningIcon />}
      {isDone ? "PROCESSING ON LEETIFY" : "UPLOAD TO LEETIFY"}
    </button>
  );
}

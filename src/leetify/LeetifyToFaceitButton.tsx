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
        "mt-3 mb-3.5 flex h-8 w-full items-center justify-center gap-2 rounded-sm border-0 px-6 py-2 font-bold text-white brightness-100 transition-all duration-100",
        isDone
          ? "bg-gray-500"
          : "bg-leetify drop-shadow-glow hover:brightness-125",
      )}
      onClick={handleClick}
      disabled={isDone}
    >
      {showWarning && <WarningIcon />}
      {isDone ? "PROCESSING ON LEETIFY" : "UPLOAD TO LEETIFY"}
    </button>
  );
}

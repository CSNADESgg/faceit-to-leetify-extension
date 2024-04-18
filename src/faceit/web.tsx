import React from "react";
import { createRoot } from "react-dom/client";
import FaceitToLeetifyButton from "./FaceitToLeetifyButton";
import FaceitDownloadButton from "./FaceitDownloadButton";
import "./global";
import { hookTurnstile } from "./useTurnstile";
import { FaceitToLeetifyLoadEventPayload, global } from "./global";

const ADD_DOWNLOAD_BUTTON = false;

console.log(
  "Loaded FACEIT to Leetify extension for FACEIT injection in web page context",
);

// Check if redirected from Leetify
if (new URLSearchParams(location.search).get("faceit-to-leetify") === "auto") {
  global.automatic = true;
}

// Listen for extension load event
document.addEventListener("faceitToLeetify__load", (event) => {
  if (!("detail" in event)) {
    return;
  }
  const payload = event.detail as FaceitToLeetifyLoadEventPayload;

  global.autoUpload = payload.autoUpload;
});

function onDomChange() {
  hookTurnstile();

  // Only inject button if not on page
  if (document.getElementById("__faceit-to-leetify")) {
    return;
  }

  // Get the info panel of match page
  const parent = document.querySelector<HTMLDivElement>(
    "#parasite-container #MATCHROOM-OVERVIEW div[name=info]",
  );
  if (!parent) {
    return;
  }
  // Check if captcha is rendered
  if (!parent.querySelector("#cf-turnstile")) {
    return;
  }

  // Apply styling to info container for to prevent clipping of button glow
  parent.style.marginLeft = "-8px";
  parent.style.marginRight = "-8px";
  parent.style.padding = "16px 8px";

  // Find "Watch demo" button
  let button = parent.querySelector(
    "div:first-child > div:first-child > button > span",
  )?.parentElement;
  if (!button && ADD_DOWNLOAD_BUTTON) {
    // Add button root after "Watch match" button
    const div = document.createElement("div");
    div.id = "__faceit-to-leetify-download";
    parent.querySelector("div:first-child > div:first-child > a")?.before(div);
    button = div;

    // Render button
    const root = createRoot(div);
    root.render(<FaceitDownloadButton />);
  } else if (!button) {
    return;
  }

  // Add button root after "Watch match" button
  const div = document.createElement("div");
  div.id = "__faceit-to-leetify";
  button.after(div);

  // Render button
  const root = createRoot(div);
  root.render(<FaceitToLeetifyButton />);
}

onDomChange();

// Watch all DOM changes
const observer = new MutationObserver(onDomChange);
observer.observe(document.documentElement, { subtree: true, childList: true });

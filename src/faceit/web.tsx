import React from "react";
import { createRoot } from "react-dom/client";
import FaceitToLeetifyButton from "./FaceitToLeetifyButton";
import "./window";
import { hookTurnstile } from "./useTurnstile";

console.log(
  "Loaded FACEIT to Leetify extension for FACEIT injection in web page context",
);

// Check if redirected from Leetify
if (new URLSearchParams(location.search).get("faceit-to-leetify") === "auto") {
  window.__faceitToLeetifyAutomatic = true;
}

// Listen for extension ID injection
document.addEventListener("faceitToLeetify__extId", (event) => {
  if (!("detail" in event) || window.__faceitToLeetifyExtId) {
    return;
  }
  window.__faceitToLeetifyExtId = event.detail as string;
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
  // Find "Watch demo" button. Can't read textContent as FACEIT is i18n
  const button = parent.querySelector(
    "div:first-child > div:first-child > button > span",
  )?.parentElement;
  if (!button) {
    return;
  }

  // Apply styling to info container for to prevent clipping of button glow
  parent.style.marginLeft = "-8px";
  parent.style.marginRight = "-8px";
  parent.style.padding = "16px 8px";

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

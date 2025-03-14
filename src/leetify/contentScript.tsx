import React from "react";
import LeetifyToFaceitListButton from "./LeetifyToFaceitListButton";
import { createRoot } from "react-dom/client";
import LeetifyToFaceitSection from "./LeetifyToFaceitSection";
import { global, isQueryParamDone, isQueryParamOld } from "./global";

console.log("Loaded FACEIT to Leetify extension for Leetify");

const leetifyIdRegex = /https:\/\/leetify\.com\/app\/match-details\/([^?/]*)/;
export function getLeetifyId(url: string) {
  const id = leetifyIdRegex.exec(url)?.[1];
  if (!id) {
    throw new Error(`Could not extract Leetify ID from URL: ${url}`);
  }

  return id;
}

function onDomChange() {
  if (location.pathname.startsWith("/app/match-details")) {
    // Match page

    // Save and clean query params
    global.initialQueryParams = new URLSearchParams(location.search);
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

    // Only inject button if not on page
    if (document.getElementById("__faceit-to-leetify")) {
      return;
    }

    // Only add for FACEIT pages
    const faceitLink = document.querySelector(
      "a[href*='https://www.faceit.com']",
    );
    if (!faceitLink) {
      return;
    }

    const paragraph = document.querySelector<HTMLParagraphElement>(
      "header div.banner p",
    );
    if (!paragraph) {
      return;
    }

    // Hide
    paragraph.style.display = "none";

    // Add button root after paragraph
    const div = document.createElement("div");
    div.id = "__faceit-to-leetify";
    div.style.width = "100%";
    paragraph.after(div);

    // Render button and description
    const root = createRoot(div);
    root.render(<LeetifyToFaceitSection />);
  } else if (location.pathname.startsWith("/app/matches/list")) {
    // Match list page

    // Get all match rows
    document
      .querySelectorAll("app-matches-list tr, app-matches-list-v2 tr")
      .forEach((row) => {
        // Only inject button if not in row
        if (row.querySelector(".__faceit-to-leetify")) {
          return;
        }

        // Only add for unprocessed matches
        // Location can be first or second column
        const column = row.querySelector("td.map");

        if (!column || column.textContent !== "Upload Demo") {
          return;
        }

        // Only add for FACEIT source
        const source = row.querySelector<HTMLImageElement>(
          "app-data-source-icon img",
        );
        if (!source?.src.includes("faceit")) {
          return;
        }

        column.innerHTML = "";

        // Remove default styling
        column.classList.remove("map");
        column.classList.add("__faceit-to-leetify");

        // Get Leetify match ID from link
        const link = (row.parentElement as HTMLAnchorElement).href;
        const id = getLeetifyId(link);

        // Render button
        const root = createRoot(column);
        root.render(<LeetifyToFaceitListButton id={id} />);
      });
  }
}

onDomChange();

// Watch all DOM changes
const observer = new MutationObserver(onDomChange);
observer.observe(document.documentElement, { subtree: true, childList: true });

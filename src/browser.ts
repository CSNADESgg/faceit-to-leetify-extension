export const isFirefox = chrome.runtime
  .getURL("")
  .startsWith("moz-extension://");
export const isChrome = chrome.runtime
  .getURL("")
  .startsWith("chrome-extension://");

export enum Browser {
  Chrome = "chrome",
  Firefox = "firefox",
}
export const currentBrowser = isFirefox
  ? Browser.Firefox
  : isChrome
    ? Browser.Chrome
    : (() => {
        throw new Error("Could not determine browser");
      })();

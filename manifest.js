export default (browser) => ({
  manifest_version: 3,
  version: "0.5.0",
  name: "FACEIT to Leetify Demo Uploader by CSNADES.gg",
  description:
    "Automatically upload FACEIT match demos to Leetify. Made by CSNADES.gg",
  browser_specific_settings:
    browser === "firefox"
      ? {
          gecko: {
            id: "faceit-to-leetify@csnades.gg",
          },
        }
      : undefined,
  icons: {
    48: "icon.48.png",
    128: "icon.128.png",
  },

  content_scripts: [
    {
      matches: ["https://faceit.com/*", "https://www.faceit.com/*"],
      js: ["/faceit/contentScript.js"],
      css: ["styles.inject.css"],
    },
    {
      all_frames: true,
      matches: ["https://leetify.com/gcpd-extension-auth"],
      js: ["leetify/auth/contentScript.js"],
    },
    {
      matches: ["https://leetify.com/app/*"],
      js: ["leetify/contentScript.js"],
      css: ["styles.inject.css"],
    },
  ],
  background:
    browser === "firefox"
      ? {
          scripts: ["serviceWorker.js"],
        }
      : {
          service_worker: "serviceWorker.js",
          type: "module",
        },
  action: {
    default_popup: "public/popup.html",
  },

  web_accessible_resources: [
    {
      resources: ["faceit/web.js", "styles.inject.css"],
      matches: ["https://faceit.com/*", "https://www.faceit.com/*"],
    },
  ],
  externally_connectable:
    browser === "chrome"
      ? {
          ids: ["*"],
          matches: [
            "https://faceit.com/*",
            "https://www.faceit.com/*",
            "https://leetify.com/*",
          ],
        }
      : undefined,
  permissions: browser === "chrome" ? ["offscreen", "storage"] : ["storage"],
});

import * as esbuild from "esbuild";
import postcss from "postcss";
import fs from "fs";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import buildManifest from "./manifest.js";

// List of files to build/copy
const sourceFiles = [
  "src/faceit/contentScript.ts",
  "src/faceit/web.tsx",
  "src/leetify/auth/contentScript.ts",
  "src/leetify/auth/offscreen.ts",
  "src/leetify/contentScript.tsx",
  "src/serviceWorker.ts",
  "src/extension/toggle.ts",
];
const staticFiles = {
  "icon.48.png": "icon.48.png",
  "icon.128.png": "icon.128.png",
  "src/leetify/auth/iframe.html": "public/leetify-auth.html",
  "src/extension/popup.html": "public/popup.html",
  "src/extension/intro.html": "public/intro.html",
  "src/extension/csnades-logo.png": "public/csnades-logo.png",
  "src/extension/intro-faceit.png": "public/intro-faceit.png",
};

// Setup build directory
fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync("dist");
fs.mkdirSync("dist/public");

await build("chrome");
await build("firefox");

async function build(browser) {
  const DEV = process.env.DEV === "true";

  fs.mkdirSync(`dist/${browser}`);
  fs.mkdirSync(`dist/${browser}/public`);

  fs.writeFileSync(
    `dist/${browser}/manifest.json`,
    JSON.stringify(buildManifest(browser), null, 2),
  );

  // Build source files
  await esbuild.build({
    entryPoints: sourceFiles,
    bundle: true,
    outdir: `dist/${browser}`,
    target: ["chrome85"],
    jsx: "automatic",
    minify: !DEV,
    sourcemap: DEV,
  });

  // Copy static files
  Object.entries(staticFiles).forEach(([source, destination]) => {
    fs.copyFileSync(source, `dist/${browser}/${destination}`);
  });

  // Build CSS and write
  async function buildCss(config, file) {
    const postcssPlugins = [
      tailwindcss({ config }),
      autoprefixer,
      !DEV && cssnano({ preset: "default" }),
    ];
    const postcssResult = await postcss(postcssPlugins.filter(Boolean)).process(
      fs.readFileSync(`src/${file}`),
      {
        from: `src/${file}`,
        to: `dist/${browser}/${file}`,
        map: DEV,
      },
    );
    fs.writeFileSync(`dist/${browser}/${file}`, postcssResult.css);
    if (postcssResult.map && DEV) {
      fs.writeFileSync(
        `dist/${browser}/${file}.map`,
        postcssResult.map.toString(),
      );
    }
  }

  // Build styles for FACEIT/Leetify
  await buildCss("tailwind.inject.config.js", "styles.inject.css");
  // Build styles for popup/intro tab
  await buildCss("tailwind.extension.config.js", "styles.extension.css");
}

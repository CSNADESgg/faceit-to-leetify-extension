/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx,html}", "!./src/popup.html"],
  theme: {
    extend: {
      colors: {
        leetify: "#f84982",
      },
      dropShadow: (theme) => ({
        glow: [`0 0 4px ${theme("colors.leetify")}`],
      }),
    },
  },
  corePlugins: {
    preflight: false,
  },
};

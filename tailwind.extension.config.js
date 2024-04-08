/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/extension/popup.html", "./src/extension/intro.html"],
  theme: {
    extend: {
      colors: {
        leetify: "#f84982",
      },
    },
  },
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@pihitpihit/plastic/dist/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Satisfactory-ish palette
        ficsit: {
          orange: "#fa9549",
          dark: "#0c0c0c",
          panel: "#1a1a1a",
          border: "#2b2b2b",
        },
      },
    },
  },
  plugins: [],
};

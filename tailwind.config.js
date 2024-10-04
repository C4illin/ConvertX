/* eslint-disable @typescript-eslint/no-require-imports */
/** @type {import('tailwindcss').Config} */
 
module.exports = {
  content: ["./src/**/*.{html,js,tsx,jsx,cjs,mjs}"],
  theme: {
    extend: {
      colors: {
        contrast: "rgba(var(--contrast))",
        "neutral-900": "rgba(var(--neutral-900))",
        "neutral-800": "rgba(var(--neutral-800))",
        "neutral-700": "rgba(var(--neutral-700))",
        "neutral-600": "rgba(var(--neutral-600))",
        "neutral-500": "rgba(var(--neutral-500))",
        "neutral-400": "rgba(var(--neutral-400))",
        "neutral-300": "rgba(var(--neutral-300))",
        "neutral-200": "rgba(var(--neutral-200))",
        "neutral-100": "rgba(var(--neutral-100))",
        "accent-600": "rgba(var(--accent-600))",
        "accent-500": "rgba(var(--accent-500))",
        "accent-400": "rgba(var(--accent-400))",
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
};

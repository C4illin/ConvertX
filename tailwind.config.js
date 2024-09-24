/** @type {import('tailwindcss').Config} */
import scrollbar from 'tailwind-scrollbar';
// eslint-disable-next-line no-undef
module.exports = {
  content: ["./src/**/*.{html,js,tsx,jsx,cjs,mjs}"],
  theme: {
    extend: {},
  },
  plugins: [scrollbar()],
}
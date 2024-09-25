/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line no-undef
module.exports = {
  content: ['./src/**/*.{html,js,tsx,jsx,cjs,mjs}'],
  theme: {
    extend: {},
  },
  plugins: [require('tailwind-scrollbar')],
}

import autoprefixer from "autoprefixer";
import cssnano from "cssnano";
import tailwind from "tailwindcss";
import tailwindConfig from "./tailwind.config.js";

export default {
  plugins: [autoprefixer, tailwind(tailwindConfig), cssnano],
};

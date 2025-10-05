/**
 * @type {import('prettier').Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig}
 */
const config = {
  arrowParens: "always",
  printWidth: 100,
  singleQuote: false,
  semi: true,
  tabWidth: 2,
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
};

export default config;

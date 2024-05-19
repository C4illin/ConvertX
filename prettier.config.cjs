/**
 * @type {import('prettier').Config & import("@ianvs/prettier-plugin-sort-imports").PluginConfig}
 */
const config = {
  arrowParens: "always",
  printWidth: 80,
  singleQuote: false,
  semi: true,
  tabWidth: 2,
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
};

export default config;
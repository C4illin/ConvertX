import { fixupPluginRules } from "@eslint/compat";
import eslint from "@eslint/js";
import deprecationPlugin from "eslint-plugin-deprecation";
import eslintPluginReadableTailwind from "eslint-plugin-readable-tailwind";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import tailwind from "eslint-plugin-tailwindcss";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tailwind.configs["flat/recommended"],
  {
    plugins: {
      deprecation: fixupPluginRules(deprecationPlugin),
      "simple-import-sort": simpleImportSortPlugin,
      "readable-tailwind": eslintPluginReadableTailwind,
    },
    ignores: ["**/node_modules/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    files: ["**/*.{js,mjs,cjs,tsx,ts}"],
    rules: {
      ...eslintPluginReadableTailwind.configs.warning.rules,
      "tailwindcss/classnames-order": "off",
      "readable-tailwind/multiline": [
        "warn",
        {
          group: "newLine",
          printWidth: 100,
        },
      ],
      "tailwindcss/no-custom-classname": [
        "warn",
        {
          whitelist: [
            "select_container",
            "convert_to_popup",
            "convert_to_group",
            "target",
            "convert_to_target",
          ],
        },
      ],
    },
  },
);

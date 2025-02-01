import js from "@eslint/js";
import eslintParserTypeScript from "@typescript-eslint/parser";
import type { Linter } from "eslint";
import eslintPluginReadableTailwind from "eslint-plugin-readable-tailwind";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tailwind.configs["flat/recommended"],
  {
    plugins: {
      "simple-import-sort": simpleImportSortPlugin,
      "readable-tailwind": eslintPluginReadableTailwind,
    },
    ignores: ["**/node_modules/**"],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    files: ["**/*.{js,mjs,cjs,jsx,tsx,ts}"],
    rules: {
      ...eslintPluginReadableTailwind.configs.warning.rules,
      // "tailwindcss/classnames-order": "off",
      "readable-tailwind/multiline": [
        "warn",
        {
          group: "newLine",
          printWidth: 100,
        },
      ],
      // "tailwindcss/no-custom-classname": [
      //   "warn",
      //   {
      //     whitelist: [
      //       "select_container",
      //       "convert_to_popup",
      //       "convert_to_group",
      //       "target",
      //       "convert_to_target",
      //     ],
      //   },
      // ],
    },
  },
] as Linter.Config[];

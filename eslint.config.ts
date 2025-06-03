import js from "@eslint/js";
import eslintParserTypeScript from "@typescript-eslint/parser";
import type { Linter } from "eslint";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
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
      "better-tailwindcss": eslintPluginBetterTailwindcss,
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
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/main.css",
      },
    },
    rules: {
      ...(eslintPluginBetterTailwindcss.configs["recommended-warn"] ?? {}).rules,
      ...(eslintPluginBetterTailwindcss.configs["stylistic-warn"] ?? {}).rules,
      // "tailwindcss/classnames-order": "off",
      "better-tailwindcss/multiline": [
        "warn",
        {
          group: "newLine",
          printWidth: 100,
        },
      ],
      "better-tailwindcss/no-unregistered-classes": [
        "warn",
        {
          ignore: [
            "^group(?:\\/(\\S*))?$",
            "^peer(?:\\/(\\S*))?$",
            "select_container",
            "convert_to_popup",
            "convert_to_group",
            "target",
            "convert_to_target",
            "job-details-toggle",
          ],
        },
      ],
    },
  },
] as Linter.Config[];

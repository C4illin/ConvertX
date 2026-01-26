import js from "@eslint/js";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint, { parser as eslintParserTypeScript } from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/node_modules/**", "dist/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,cts,mts}"],
    extends: [
      eslintPluginBetterTailwindcss.configs.recommended,
      eslintPluginBetterTailwindcss.configs.stylistic,
    ],
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
      globals: {
        ...globals.node,
      },
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/main.css",
      },
    },
    rules: {
      "better-tailwindcss/enforce-consistent-line-wrapping": [
        "warn",
        {
          group: "newLine",
          printWidth: 100,
        },
      ],
      "better-tailwindcss/no-unknown-classes": [
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
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ["**/*.{js,cjs,mjs,jsx}"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
);

import js from "@eslint/js";
import eslintParserTypeScript from "@typescript-eslint/parser";
import eslintPluginBetterTailwindcss from "eslint-plugin-better-tailwindcss";
import globals from "globals";
import tseslint from "typescript-eslint";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "eslint.config.ts", "dist/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{tsx,ts}"],
    plugins: {
      "better-tailwindcss": eslintPluginBetterTailwindcss,
    },
    languageOptions: {
      parser: eslintParserTypeScript,
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
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
      ...(eslintPluginBetterTailwindcss.configs["recommended-warn"] ?? {}).rules,
      ...(eslintPluginBetterTailwindcss.configs["stylistic-warn"] ?? {}).rules,
      // "tailwindcss/classnames-order": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": [
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

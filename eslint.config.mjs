import { fixupPluginRules } from "@eslint/compat";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import deprecationPlugin from "eslint-plugin-deprecation";
import importPlugin from "eslint-plugin-import";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import tailwind from "eslint-plugin-tailwindcss";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs"

export default tseslint.config(
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      deprecation: fixupPluginRules(deprecationPlugin),
      import: fixupPluginRules(importPlugin),
      "simple-import-sort": simpleImportSortPlugin,
    },
  },
  {
    ignores: ["**/node_modules/**", "**/public/**"],
  },
  eslint.configs.recommended,
  comments.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...tailwind.configs["flat/recommended"],
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: "latest",
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
    },
    rules: {
      "tailwindcss/no-custom-classname": [
        "error", 
        { 
          "config": "./tailwind.config.js",
          "whitelist": ['select_container', 'convert_to_popup', 'convert_to_group', 'target', 'convert_to_target']
        }
      ],
    }
  },
);

import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import deprecationPlugin from "eslint-plugin-deprecation";
import importPlugin from "eslint-plugin-import";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";
import tailwind from "eslint-plugin-tailwindcss";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  comments.recommended,
  ...tseslint.configs.recommended,
  ...tailwind.configs["flat/recommended"],
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      deprecation: fixupPluginRules(deprecationPlugin),
      import: fixupPluginRules(importPlugin),
      "simple-import-sort": simpleImportSortPlugin,
    },
    ignores: ["**/node_modules/**", "**/public/**"],
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
      },
    },
    files: ["**/*.{js,mjs,cjs}"],
    rules: {
      "tailwindcss/no-custom-classname": [
        "error",
        {
          config: "./tailwind.config.js",
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

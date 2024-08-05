import { fixupPluginRules } from "@eslint/compat";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import deprecationPlugin from "eslint-plugin-deprecation";
import eslintCommentsPlugin from "eslint-plugin-eslint-comments";
import importPlugin from "eslint-plugin-import";
import simpleImportSortPlugin from "eslint-plugin-simple-import-sort";

export default tseslint.config(
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      deprecation: fixupPluginRules(deprecationPlugin),
      "eslint-comments": eslintCommentsPlugin,
      import: fixupPluginRules(importPlugin),
      "simple-import-sort": simpleImportSortPlugin,
    },
  },
  {
    ignores: ["**/node_modules/**", "**/public/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
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
  },
);

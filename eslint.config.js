// Flat ESLint config. Kept intentionally lightweight: TypeScript's own
// type-checker (`npm run lint`) does the heavy lifting; ESLint catches
// stylistic and common-bug patterns. Run with `npm run lint:eslint`.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "build/**", "coverage/**", ".data/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  }
);

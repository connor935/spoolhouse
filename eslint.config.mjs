import eslint from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import oxlint from "eslint-plugin-oxlint";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "drizzle/**",
      "public/**",
      "next-env.d.ts",
    ],
  },

  eslint.configs.recommended,
  tseslint.configs.recommended,
  unicorn.configs.recommended,

  // TypeScript style guide
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      complexity: ["warn", { max: 10 }],
      "no-nested-ternary": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use literal unions instead of enums.",
        },
      ],
    },
  },

  // Unicorn rules customization
  {
    name: "app/unicorn-overrides",
    rules: {
      "unicorn/better-regex": "warn",
      "unicorn/custom-error-definition": "error",
      "unicorn/no-unused-properties": "warn",
      "unicorn/consistent-destructuring": "warn",
      "unicorn/no-null": "off",
      "unicorn/filename-case": "off",
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-await-expression-member": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/no-useless-undefined": "off",
      "unicorn/name-replacements": "off",
    },
  },

  // Plain JS files (no TS parser) need Node globals
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },

  // CLI scripts: process.exit and sequential top-level logic are fine
  {
    files: ["scripts/**"],
    rules: {
      "unicorn/no-process-exit": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },

  // Disable rules handled by Oxlint (must come after the rule configs)
  ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),

  // Let Prettier own formatting
  prettier
);

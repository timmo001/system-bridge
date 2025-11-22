import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import litPlugin from "eslint-plugin-lit";
import wcPlugin from "eslint-plugin-wc";
import litA11yPlugin from "eslint-plugin-lit-a11y";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

export default tseslint.config(
  // Base configurations
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,

  // Global settings
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      import: importPlugin,
      lit: litPlugin,
      wc: wcPlugin,
      "lit-a11y": litA11yPlugin,
      "unused-imports": unusedImports,
    },

    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
    },

    rules: {
      // Core ESLint rules
      "no-console": "off",
      "no-bitwise": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "object-shorthand": "off",
      "prefer-template": "off",
      "prefer-destructuring": "off",
      "no-nested-ternary": "off",
      "no-void": "off",

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "off", // Handled by unused-imports
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["PascalCase"],
        },
        {
          selector: "property",
          format: null,
        },
        {
          selector: "method",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
      ],
      "@typescript-eslint/no-dynamic-delete": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/unbound-method": "warn",

      // Import rules
      "import/no-default-export": "off",
      "import/prefer-default-export": "off",
      "import/no-unresolved": "off", // TypeScript handles this
      "import/extensions": "off", // Let TypeScript handle this with moduleResolution: bundler
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: "~/**",
              group: "internal",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],

      // Unused imports
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // Lit rules
      "lit/no-invalid-html": "error",
      "lit/no-useless-template-literals": "error",
      "lit/attribute-value-entities": "error",
      "lit/binding-positions": "error",
      "lit/no-duplicate-template-bindings": "error",
      "lit/no-invalid-escape-sequences": "error",
      "lit/no-legacy-template-syntax": "error",
      "lit/no-property-change-update": "error",
      "lit/no-template-arrow": "warn", // Warn instead of error for gradual adoption
      "lit/no-template-bind": "error",
      "lit/no-template-map": "warn", // Warn instead of error for gradual adoption
      "lit/no-this-assign-in-render": "warn", // Warn instead of error for gradual adoption
      "lit/no-value-attribute": "error",

      // Web Components rules
      "wc/no-constructor-attributes": "error",
      "wc/no-invalid-element-name": "error",
      "wc/no-self-class": "error",

      // Accessibility rules
      "lit-a11y/alt-text": "error",
      "lit-a11y/aria-attr-valid-value": "error",
      "lit-a11y/aria-attrs": "error",
      "lit-a11y/aria-role": "error",
      "lit-a11y/aria-unsupported-elements": "error",
      "lit-a11y/click-events-have-key-events": "warn",
      "lit-a11y/img-redundant-alt": "error",
      "lit-a11y/mouse-events-have-key-events": "warn",
      "lit-a11y/no-access-key": "error",
      "lit-a11y/no-autofocus": "off",
      "lit-a11y/no-invalid-change-handler": "error",
      "lit-a11y/role-has-required-aria-attrs": "error",
      "lit-a11y/role-supports-aria-attr": "error",
      "lit-a11y/tabindex-no-positive": "error",
    },
  },

  // Ignore patterns
  {
    ignores: ["dist/**", "node_modules/**", "*.config.*", "vite.config.ts"],
  },
);

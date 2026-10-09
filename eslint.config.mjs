import babelParser from "@babel/eslint-parser";

export default [
  { ignores: ["src/generated/**"] },
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.ts", "public/widget.js"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ["typescript", "jsx"] },
        },
      },
    },
    rules: {
      curly: ["error", "all"],
      "one-var": ["error", "never"],
      "no-nested-ternary": "error",
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: { plugins: ["typescript"] },
        },
      },
    },
  },
];

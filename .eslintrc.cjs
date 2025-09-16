/* eslint-env node */
module.exports = {
  root: true,
  extends: ["next", "next/core-web-vitals", "eslint:recommended", "plugin:import/recommended", "plugin:import/typescript", "plugin:prettier/recommended"],
  plugins: ["simple-import-sort"],
  rules: {
    "import/order": "off",
    "simple-import-sort/imports": [
      "error",
      {
        groups: [
          // Packages
          ["^@?\\w"],
          // Internal alias
          ["^@/"],
          // Relative
          ["^\\./", "^\\../"]
        ]
      }
    ],
    "simple-import-sort/exports": "error",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
  },
  settings: {
    "import/resolver": {
      typescript: {},
      node: { extensions: [".js", ".jsx", ".ts", ".tsx"] }
    }
  }
};

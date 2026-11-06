import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      "desktop/**",
      "e2e/**",
      ".next/**",
      "dist/**",
      "coverage/**",
      "src/generated/**",
    ],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: false,
    },
    ignorePatterns: [
      "desktop/**",
      "e2e/**",
      ".next/**",
      "dist/**",
      "coverage/**",
      "src/generated/**",
    ],
    rules: {
      "no-control-regex": "off",
      "nextjs/no-html-link-for-pages": "off",
      "jsx-a11y/prefer-tag-over-role": "off",
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/anchor-has-content": "off",
      "react/purity": "off",
    },
    plugins: ["react", "nextjs"],
  },
});

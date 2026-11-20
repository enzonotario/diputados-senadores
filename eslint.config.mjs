// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default withNuxt([
  eslintPluginPrettierRecommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Props opcionales tipadas con TS ya son `undefined` por defecto.
      "vue/require-default-prop": "off",
      "vue/block-order": [
        "error",
        {
          order: ["script", "template", "style"],
        },
      ],
    },
  },
]);

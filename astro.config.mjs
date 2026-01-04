import { defineConfig } from "astro/config";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@astrojs/react";

export default defineConfig({
  vite: {
    plugins: [basicSsl()],
    ssr: {
      noExternal: ["styled-components", "@emotion/*"],
    },
  },
  integrations: [react()],
  srcDir: "./site/app/src",
  publicDir: "./public",
  outDir: "./site-dist/app",
});

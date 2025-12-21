import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  srcDir: "./site/app/src",
  publicDir: "./site/app/public",
  outDir: "./site-dist/app",
});

import { defineConfig } from "vite";

export default defineConfig({
  build: { target: "esnext" },
  server: { host: "0.0.0.0" },
  clearScreen: false,
});

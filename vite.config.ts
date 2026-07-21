import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

const rendererDir = path.resolve(__dirname, "src/renderer");

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === "build" ? obfuscatorPlugin({
      include: ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
      exclude: [/node_modules/],
      apply: "build",
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        debugProtection: true,
        disableConsoleOutput: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      },
    }) : null,
  ],
  root: rendererDir,
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(rendererDir, "src"),
    },
  },
}));

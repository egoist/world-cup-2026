import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mode === "production" && {
      name: "umami-production-script",
      transformIndexHtml() {
        return [
          {
            tag: "script",
            attrs: {
              defer: true,
              src: "https://u.egoist.dev/script.js",
              "data-website-id": "71e6d296-17c8-47a5-be0b-34fe3573b33a",
            },
            injectTo: "head",
          },
        ]
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))

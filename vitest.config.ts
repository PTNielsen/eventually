import { svelte } from "@sveltejs/vite-plugin-svelte"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        dev: true,
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    environmentOptions: {
      happyDOM: {
        settings: {
          navigator: {
            userAgent: "Mozilla/5.0",
          },
        },
      },
    },
  },
  resolve: {
    alias: {
      $lib: "/src/lib",
    },
    conditions: ["browser"],
  },
})

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: [
      "agents/**/*.spec.ts",
      "engines/**/*.spec.ts",
      "libs/**/*.spec.ts",
      "apps/**/*.spec.ts"
    ],
    coverage: {
      reporter: ["text", "lcov"],
      provider: "v8"
    }
  }
});

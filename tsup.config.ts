import { defineConfig } from "tsup";

export default defineConfig({
  // Core (`index`) is React-free. The `react` entry holds the hook and keeps
  // React out of the core bundle so non-React hosts (servers, workers) can use
  // the activity bus + effect dispatcher + undo stack with zero React.
  entry: { index: "src/index.ts", react: "src/react.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react"],
  treeshake: true,
});

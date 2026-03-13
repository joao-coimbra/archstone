import { defineConfig } from "bunup"
import { exports } from "bunup/plugins"

export default defineConfig({
  entry: [
    "src/core/index.ts",
    "src/domain/index.ts",
    "src/domain/application/index.ts",
    "src/domain/enterprise/index.ts",
  ],
  format: ["esm"],
  target: "bun",
  dts: true,
  clean: true,
  plugins: [exports()],
})

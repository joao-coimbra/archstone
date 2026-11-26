#!/usr/bin/env bun
/**
 * Native Bun library build (replacement target for bunup).
 *
 * Safe to run anytime: fails closed unless `dts: true` actually emits
 * declarations for every published entry point. Keep `bun run build`
 * on bunup until `bun run probe:native-dts` exits 0.
 *
 * Usage: bun scripts/build-native.ts
 */

import { rm } from "node:fs/promises"
import { join } from "node:path"

const OUTDIR = "dist"

const ENTRYPOINTS = [
  "./src/index.ts",
  "./src/core/index.ts",
  "./src/domain/index.ts",
  "./src/domain/application/index.ts",
  "./src/domain/enterprise/index.ts",
] as const

const REQUIRED_DTS = [
  "index.d.ts",
  "core/index.d.ts",
  "domain/index.d.ts",
  "domain/application/index.d.ts",
  "domain/enterprise/index.d.ts",
] as const

async function main(): Promise<void> {
  await rm(OUTDIR, { recursive: true, force: true })

  const result = await Bun.build({
    entrypoints: [...ENTRYPOINTS],
    outdir: OUTDIR,
    root: "./src",
    format: "esm",
    target: "bun",
    splitting: true,
    minify: true,
    dts: true,
  })

  if (!result.success) {
    for (const log of result.logs) {
      console.error(String(log))
    }
    throw new Error("Bun.build failed")
  }

  const missing: string[] = []
  for (const relative of REQUIRED_DTS) {
    if (!(await Bun.file(join(OUTDIR, relative)).exists())) {
      missing.push(relative)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Native build did not emit required .d.ts files: ${missing.join(", ")}. ` +
        "Keep bunup until a stable Bun release passes `bun run probe:native-dts`."
    )
  }

  const dtsCount = result.outputs.filter((output) =>
    output.path.endsWith(".d.ts")
  ).length
  console.log(
    `Native build ok — ${result.outputs.length} outputs (${dtsCount} .d.ts) in ${OUTDIR}/`
  )
}

await main()

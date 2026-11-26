#!/usr/bin/env bun
/**
 * Native Bun library build (replacement target for bunup).
 *
 * Uses the CLI (`bun build --dts`) because `Bun.build({ dts: true })` still
 * panics on cross-module class types in canary (#49457).
 *
 * After emit, rewrites `@/` aliases in `.d.ts` to relative `.js` imports so
 * npm consumers can resolve types (Bun does not rewrite them yet).
 *
 * Keep `bun run build` on bunup until `bun run probe:native-dts` exits 0 on
 * a stable Bun release; then an agent cutover should make this the real build.
 *
 * Usage: bun scripts/build-native.ts [--watch]
 */

import { readdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { $ } from "bun"
import { rewriteDtsAliases } from "./rewrite-dts-aliases"

const OUTDIR = "dist"
const watch = process.argv.includes("--watch")

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

async function collectDtsFiles(root: string): Promise<string[]> {
  const files: string[] = []
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (entry.name.endsWith(".d.ts")) {
        files.push(path)
      }
    }
  }
  await walk(root)
  return files
}

async function main(): Promise<void> {
  await rm(OUTDIR, { recursive: true, force: true })

  const watchArgs = watch ? ["--watch"] : []
  const build =
    await $`bun build ${ENTRYPOINTS} --outdir ${OUTDIR} --root ./src --format esm --target bun --splitting --minify --dts ${watchArgs}`.nothrow()

  if (build.exitCode !== 0) {
    throw new Error(
      `bun build --dts failed (exit ${build.exitCode}). Keep bunup until probe:native-dts passes.`
    )
  }

  if (watch) {
    // Watch mode is long-running; alias rewrite runs on each rebuild via a
    // follow-up once Bun supports a post-build hook. For now require non-watch
    // cutover builds for publishable output.
    console.log("Watch mode started (alias rewrite runs on non-watch builds).")
    return
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

  const rewritten = await rewriteDtsAliases(OUTDIR)

  const dtsFiles = await collectDtsFiles(OUTDIR)
  const aliasHits: string[] = []
  for (const file of dtsFiles) {
    const text = await Bun.file(file).text()
    if (text.includes('"@/') || text.includes("'@/")) {
      aliasHits.push(file)
    }
  }
  if (aliasHits.length > 0) {
    throw new Error(
      `Native .d.ts still contain @/ path aliases after rewrite (${aliasHits.length} files).`
    )
  }

  console.log(
    `Native build ok — ${dtsFiles.length} .d.ts file(s) in ${OUTDIR}/ (rewrote aliases in ${rewritten})`
  )
}

await main()

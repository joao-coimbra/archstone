#!/usr/bin/env bun
/**
 * Clean cutover from bunup → native `bun build --dts`.
 *
 * Safe to run anytime: exits non-zero unless `probe:native-dts` passes first.
 * When it succeeds it:
 * - points `build` / `dev` at `scripts/build-native.ts`
 * - removes temporary `build:native` script
 * - removes the `bunup` dependency
 * - deletes `bunup.config.ts`
 * - refreshes the lockfile
 * - runs `bun test` and `bun run build`
 *
 * Usage: bun scripts/cutover-native-dts.ts
 */

import { rm } from "node:fs/promises"
import { $ } from "bun"

const pkgPath = "package.json"

function omitKey(
  record: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [entryKey, value] of Object.entries(record)) {
    if (entryKey !== key) {
      next[entryKey] = value
    }
  }
  return next
}

async function main(): Promise<void> {
  console.log("Running probe:native-dts…")
  const probe = await $`bun run probe:native-dts`.nothrow()
  if (probe.exitCode !== 0) {
    throw new Error(
      "probe:native-dts failed — refusing cutover. Keep bunup until a stable Bun release passes the probe."
    )
  }

  const pkg = (await Bun.file(pkgPath).json()) as {
    scripts?: Record<string, unknown>
    devDependencies?: Record<string, unknown>
    [key: string]: unknown
  }

  const scripts = omitKey(
    {
      ...(pkg.scripts ?? {}),
      build: "bun scripts/build-native.ts",
      dev: "bun scripts/build-native.ts --watch",
    },
    "build:native"
  )

  const nextPkg = {
    ...pkg,
    scripts,
    devDependencies: omitKey(pkg.devDependencies ?? {}, "bunup"),
  }

  await Bun.write(pkgPath, `${JSON.stringify(nextPkg, null, 2)}\n`)
  await rm("bunup.config.ts", { force: true })

  console.log("Installing without bunup…")
  await $`bun install`

  console.log("Verifying…")
  await $`bun test`
  await $`bun run build`

  console.log(
    "Cutover complete. Review package.json + lockfile, then open a PR. bunup is gone."
  )
}

await main()

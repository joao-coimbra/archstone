#!/usr/bin/env bun
/**
 * Clean cutover from bunup → native `bun build --dts`.
 *
 * Safe to run anytime: exits non-zero unless `probe:native-dts` passes first.
 * When it succeeds it:
 * - points `build` / `dev` at `scripts/build-native.ts`
 * - removes temporary `build:native` + one-shot `cutover:native-dts` scripts
 * - removes the `bunup` dependency and deletes `bunup.config.ts` + this file
 * - pins `packageManager`, `@types/bun`, `engines.bun`, and CI `bun-version`
 * - rewrites CLAUDE.md / README.md so bunup is not left documented
 * - refreshes the lockfile, then runs `bun test` and `bun run build`
 *
 * Usage: bun scripts/cutover-native-dts.ts
 */

import { readdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { $ } from "bun"

const pkgPath = "package.json"
const workflowDir = ".github/workflows"

const BUN_VERSION_LINE = /bun-version:\s*[\w.-]+/g
const CLAUDE_BUN_PIN = /Use \*\*Bun [\d.]+(?:\+)?\*\* exclusively[^\n]*/
const CLAUDE_BUNUP_NOTE = /Library builds still use \*\*bunup\*\*[^\n]*\n\n/
const CLAUDE_NATIVE_BUILD_ROW =
  /\| Native build \(gated\) \| `bun run build:native` \|\n/
const CLAUDE_PROBE_ROW =
  /\| Native dts readiness \| `bun run probe:native-dts` \|\n/
const README_RUNTIME_ROW =
  /\| \*\*Runtime \/ Package Manager\*\* \| \[Bun\]\(https:\/\/bun\.sh\) [^\n]+/
const README_BUILD_TOOL_ROW = /\| \*\*Build Tool\*\* \| \[bunup\]\([^)]+\) \|/
const README_REQUIREMENTS = /Requirements: \*\*Bun >= [^\n]+/

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

async function pinWorkflowBunVersion(version: string): Promise<number> {
  let updated = 0
  for (const name of await readdir(workflowDir)) {
    if (!(name.endsWith(".yml") || name.endsWith(".yaml"))) {
      continue
    }
    const path = join(workflowDir, name)
    const original = await readFile(path, "utf8")
    const next = original.replace(BUN_VERSION_LINE, `bun-version: ${version}`)
    if (next !== original) {
      await writeFile(path, next)
      updated += 1
    }
  }
  return updated
}

async function rewritePostCutoverDocs(version: string): Promise<void> {
  const claudePath = "CLAUDE.md"
  const claude = await readFile(claudePath, "utf8")
  const nextClaude = claude
    .replace(
      CLAUDE_BUN_PIN,
      `Use **Bun ${version}** exclusively — never Node.js, npm, yarn, or pnpm. The repo pins \`packageManager\` to \`bun@${version}\`.`
    )
    .replace(
      CLAUDE_BUNUP_NOTE,
      "Library builds use native `bun build --dts` via `scripts/build-native.ts` (with `rewrite-dts-aliases` for `@/` → relative imports).\n\n"
    )
    .replace(CLAUDE_NATIVE_BUILD_ROW, "")
    .replace(
      CLAUDE_PROBE_ROW,
      "| Native dts regression probe | `bun run probe:native-dts` |\n"
    )
  await writeFile(claudePath, nextClaude)

  const readmePath = "README.md"
  const readme = await readFile(readmePath, "utf8")
  const nextReadme = readme
    .replace(
      README_RUNTIME_ROW,
      `| **Runtime / Package Manager** | [Bun](https://bun.sh) ${version} (required) |`
    )
    .replace(
      README_BUILD_TOOL_ROW,
      "| **Build Tool** | Native `bun build --dts` |"
    )
    .replace(README_REQUIREMENTS, `Requirements: **Bun >= ${version}**`)
  await writeFile(readmePath, nextReadme)
}

async function main(): Promise<void> {
  console.log("Running probe:native-dts…")
  const probe = await $`bun run probe:native-dts`.nothrow()
  if (probe.exitCode !== 0) {
    throw new Error(
      "probe:native-dts failed — refusing cutover. Keep bunup until a stable Bun release passes the probe."
    )
  }

  const version = Bun.version
  const pkg = (await Bun.file(pkgPath).json()) as {
    scripts?: Record<string, unknown>
    devDependencies?: Record<string, unknown>
    engines?: Record<string, unknown>
    [key: string]: unknown
  }

  let scripts = omitKey(
    {
      ...(pkg.scripts ?? {}),
      build: "bun scripts/build-native.ts",
      dev: "bun scripts/build-native.ts --watch",
    },
    "build:native"
  )
  scripts = omitKey(scripts, "cutover:native-dts")

  const nextPkg = {
    ...pkg,
    packageManager: `bun@${version}`,
    engines: {
      ...(pkg.engines ?? {}),
      bun: `>=${version}`,
    },
    scripts,
    devDependencies: {
      ...omitKey(pkg.devDependencies ?? {}, "bunup"),
      "@types/bun": version,
    },
  }

  await Bun.write(pkgPath, `${JSON.stringify(nextPkg, null, 2)}\n`)
  await rm("bunup.config.ts", { force: true })
  const workflowCount = await pinWorkflowBunVersion(version)
  await rewritePostCutoverDocs(version)

  console.log(
    `Pinned Bun ${version} (packageManager, @types/bun, engines, ${workflowCount} workflow file(s)).`
  )
  console.log("Installing without bunup…")
  await $`bun install`

  console.log("Verifying…")
  await $`bun test`
  await $`bun run build`

  // Delete this one-shot script last so a mid-run failure remains recoverable.
  await rm("scripts/cutover-native-dts.ts", { force: true })

  console.log(
    "Cutover complete. Review package.json + lockfile + workflows + docs, then open a PR. bunup is gone."
  )
}

await main()

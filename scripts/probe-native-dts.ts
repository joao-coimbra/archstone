#!/usr/bin/env bun
/**
 * Readiness probe for migrating Archstone off bunup onto native `bun build --dts`.
 *
 * Exit 0 only when every migration gate passes. Until then, keep bunup.
 *
 * Prefer the CLI (`bun build --dts`) over `Bun.build({ dts: true })`:
 * canary's JS API still panics on class/typeof cross-module types (#49457),
 * while the CLI can emit declarations for this package.
 *
 * Known blockers as of Bun 1.4.5 / 1.4.6-canary:
 * - Stable has no `--dts` (JS only).
 * - Canary `--dts` is still experimental for 1.5.
 * - Canary CLI emits `@/` path aliases inside `.d.ts`; `rewriteDtsAliases`
 *   converts them to relative imports (same job bunup does today).
 *
 * When this exits 0: point `build`/`dev` at the native script, remove bunup
 * + bunup.config.ts (and any temporary dual scripts), re-pin Bun, open a PR.
 *
 * Usage: bun scripts/probe-native-dts.ts
 */

import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { $ } from "bun"
import { rewriteDtsAliases } from "./rewrite-dts-aliases"

const ENTRYPOINTS = [
  "./src/index.ts",
  "./src/core/index.ts",
  "./src/domain/index.ts",
  "./src/domain/application/index.ts",
  "./src/domain/enterprise/index.ts",
] as const

const SUBPATH_DTS = [
  "index.d.ts",
  "core/index.d.ts",
  "domain/index.d.ts",
  "domain/application/index.d.ts",
  "domain/enterprise/index.d.ts",
] as const

interface Gate {
  id: string
  ok: boolean
  detail: string
}

const gates: Gate[] = []

function record(id: string, ok: boolean, detail: string): void {
  gates.push({ id, ok, detail })
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`)
}

async function helpMentionsDts(): Promise<boolean> {
  const result = await $`bun build --help`.quiet().nothrow()
  return result.stdout.toString().includes("--dts")
}

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

async function runNativeBuild(outdir: string): Promise<boolean> {
  const build =
    await $`bun build ${ENTRYPOINTS} --outdir ${outdir} --root ./src --format esm --target bun --splitting --dts`
      .quiet()
      .nothrow()

  const buildOk = build.exitCode === 0
  const failure =
    build.stderr.toString().trim() ||
    build.stdout.toString().trim() ||
    `bun build --dts exited ${build.exitCode}`
  record(
    "multi-entry-build",
    buildOk,
    buildOk ? "bun build --dts succeeded" : failure.slice(0, 500)
  )
  return buildOk
}

async function findMissingSubpaths(outdir: string): Promise<string[]> {
  const missing: string[] = []
  for (const relative of SUBPATH_DTS) {
    if (!(await Bun.file(join(outdir, relative)).exists())) {
      missing.push(relative)
    }
  }
  return missing
}

async function findAliasLeaks(
  outdir: string,
  dtsFiles: string[]
): Promise<string[]> {
  const hits: string[] = []
  for (const file of dtsFiles) {
    const text = await Bun.file(file).text()
    if (text.includes('"@/') || text.includes("'@/")) {
      hits.push(file.replace(`${outdir}/`, ""))
    }
  }
  return hits
}

function aliasLeakDetail(dtsCount: number, aliasHits: string[]): string {
  if (dtsCount === 0) {
    return "skipped — no .d.ts to inspect"
  }
  if (aliasHits.length === 0) {
    return "no @/ imports in emitted .d.ts"
  }
  const listed = aliasHits.slice(0, 8).join(", ")
  const more = aliasHits.length > 8 ? "…" : ""
  return `@/ still appears in: ${listed}${more}`
}

async function runConsumerSmoke(outdir: string): Promise<void> {
  const consumerDir = join(outdir, "consumer-smoke")
  await mkdir(consumerDir, { recursive: true })
  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({
      name: "archstone-native-dts-smoke",
      type: "module",
      private: true,
    })
  )
  await writeFile(
    join(consumerDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        paths: {
          "archstone/core": [join(outdir, "core/index.d.ts")],
          "archstone/domain/enterprise": [
            join(outdir, "domain/enterprise/index.d.ts"),
          ],
          failcraft: [
            join(process.cwd(), "node_modules/failcraft/dist/index.d.ts"),
          ],
        },
      },
      include: ["./smoke.ts"],
    })
  )
  await writeFile(
    join(consumerDir, "smoke.ts"),
    `
import type { EventHandler, UniqueEntityId } from "archstone/core"
import type { AggregateRoot, Entity } from "archstone/domain/enterprise"

type _Id = UniqueEntityId
type _Entity = Entity<{ n: number }>
type _Aggregate = AggregateRoot<{ n: number }>
type _Handler = EventHandler<{
  occurredAt: Date
  getAggregateId(): UniqueEntityId
}>

const ok: [_Id, _Entity, _Aggregate, _Handler] | null = null
void ok
`
  )

  const smoke = await $`bunx tsc --noEmit -p ${consumerDir}/tsconfig.json`
    .quiet()
    .nothrow()
  const smokeOk = smoke.exitCode === 0
  record(
    "consumer-smoke",
    smokeOk,
    smokeOk
      ? "consumer can import core + domain/enterprise together"
      : smoke.stderr.toString().trim() ||
          smoke.stdout.toString().trim() ||
          "tsc smoke failed"
  )
}

async function main(): Promise<number> {
  console.log(`probe-native-dts — Bun ${Bun.version}\n`)

  const helpHasDts = await helpMentionsDts()
  record(
    "stable-cli-dts",
    helpHasDts,
    helpHasDts
      ? "`bun build --help` lists --dts"
      : "`bun build --help` does not list --dts (still missing or experimental-only)"
  )

  const outdir = await mkdtemp(join(tmpdir(), "archstone-native-dts-"))
  try {
    const buildOk = await runNativeBuild(outdir)
    const dtsFiles = buildOk ? await collectDtsFiles(outdir) : []
    record(
      "dts-emitted",
      dtsFiles.length > 0,
      dtsFiles.length > 0
        ? `emitted ${dtsFiles.length} .d.ts file(s)`
        : "`--dts` produced no .d.ts (ignored or unsupported)"
    )

    const missingSubpaths = await findMissingSubpaths(outdir)
    record(
      "subpath-dts",
      missingSubpaths.length === 0 && dtsFiles.length > 0,
      missingSubpaths.length === 0 && dtsFiles.length > 0
        ? "all published subpaths have index.d.ts"
        : `missing .d.ts: ${missingSubpaths.join(", ") || "(none emitted)"}`
    )

    if (dtsFiles.length > 0) {
      await rewriteDtsAliases(outdir)
    }
    const aliasHits = await findAliasLeaks(outdir, dtsFiles)
    record(
      "no-path-alias-leak",
      dtsFiles.length > 0 && aliasHits.length === 0,
      aliasLeakDetail(dtsFiles.length, aliasHits)
    )

    const readyForSmoke =
      missingSubpaths.length === 0 &&
      dtsFiles.length > 0 &&
      aliasHits.length === 0
    if (readyForSmoke) {
      await runConsumerSmoke(outdir)
    } else {
      record(
        "consumer-smoke",
        false,
        "skipped — dts outputs are incomplete or still leak @/"
      )
    }
  } finally {
    await rm(outdir, { recursive: true, force: true })
  }

  const failed = gates.filter((gate) => !gate.ok)
  console.log("")
  if (failed.length > 0) {
    console.log(
      `NOT READY to drop bunup — ${failed.length}/${gates.length} gates failed.`
    )
    console.log(
      "Keep bunup until a stable Bun release passes every gate above."
    )
    return 1
  }

  console.log("READY — native Bun dts satisfies Archstone migration gates.")
  return 0
}

process.exit(await main())

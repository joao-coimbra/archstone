#!/usr/bin/env bun
/**
 * Readiness probe for migrating Archstone off bunup onto native `Bun.build({ dts: true })`.
 *
 * Exit 0 only when every migration gate passes. Until then, keep bunup.
 *
 * Known blockers as of Bun 1.4.5 / 1.4.6-canary:
 * - Stable ignores `dts: true` (JS only).
 * - Canary lists `--dts` as experimental for 1.5 and panics on this
 *   package with "too little stack for a task" even for a single entry.
 *
 * When this exits 0: switch `package.json` build scripts to
 * `build:native`, remove bunup + bunup.config.ts, and re-pin Bun.
 *
 * Usage: bun scripts/probe-native-dts.ts
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { $ } from "bun"

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
  const mark = ok ? "PASS" : "FAIL"
  console.log(`[${mark}] ${id}: ${detail}`)
}

async function helpMentionsDts(): Promise<boolean> {
  const result = await $`bun build --help`.quiet().nothrow()
  return result.stdout.toString().includes("--dts")
}

async function main(): Promise<number> {
  const version = Bun.version
  console.log(`probe-native-dts — Bun ${version}\n`)

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
    const result = await Bun.build({
      entrypoints: [...ENTRYPOINTS],
      outdir,
      format: "esm",
      target: "bun",
      splitting: true,
      dts: true,
    })

    record(
      "multi-entry-build",
      result.success,
      result.success
        ? `Bun.build succeeded (${result.outputs.length} outputs)`
        : `Bun.build failed: ${result.logs.map(String).join("; ") || "unknown error"}`
    )

    const dtsOutputs = result.outputs.filter((output) =>
      output.path.endsWith(".d.ts")
    )
    record(
      "dts-emitted",
      dtsOutputs.length > 0,
      dtsOutputs.length > 0
        ? `emitted ${dtsOutputs.length} .d.ts file(s)`
        : "`dts: true` produced no .d.ts (ignored or unsupported)"
    )

    const missingSubpaths: string[] = []
    for (const relative of SUBPATH_DTS) {
      const file = Bun.file(join(outdir, relative))
      if (!(await file.exists())) {
        missingSubpaths.push(relative)
      }
    }
    record(
      "subpath-dts",
      missingSubpaths.length === 0 && dtsOutputs.length > 0,
      missingSubpaths.length === 0 && dtsOutputs.length > 0
        ? "all published subpaths have index.d.ts"
        : `missing .d.ts: ${missingSubpaths.join(", ") || "(none emitted)"}`
    )

    if (missingSubpaths.length === 0 && dtsOutputs.length > 0) {
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
    } else {
      record(
        "consumer-smoke",
        false,
        "skipped — subpath .d.ts outputs are incomplete"
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

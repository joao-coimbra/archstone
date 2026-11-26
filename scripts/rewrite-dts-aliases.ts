#!/usr/bin/env bun
/**
 * Rewrite `@/` path aliases inside emitted `.d.ts` files to relative
 * ESM imports (with `.js` extension), matching what npm consumers need.
 *
 * Bun's native `bun build --dts` currently leaves `@/` intact; bunup does
 * not. Call this after a native dts build until Bun rewrites aliases itself.
 */

import { readdir } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"

const ALIAS_RE = /from\s+(["'])@\/([^"']+)\1/gu

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

function toRelativeSpecifier(
  fromDtsFile: string,
  outdir: string,
  aliasPath: string
): string {
  // `@/core/index` → <outdir>/core/index.d.ts → import as ../core/index.js
  const target = join(outdir, aliasPath)
  let rel = relative(dirname(fromDtsFile), target).split(sep).join("/")
  if (!rel.startsWith(".")) {
    rel = `./${rel}`
  }
  if (rel.endsWith(".d.ts")) {
    rel = rel.slice(0, -".d.ts".length)
  }
  if (!rel.endsWith(".js")) {
    rel = `${rel}.js`
  }
  return rel
}

export async function rewriteDtsAliases(outdir: string): Promise<number> {
  const files = await collectDtsFiles(outdir)
  let rewritten = 0

  for (const file of files) {
    const original = await Bun.file(file).text()
    const next = original.replace(
      ALIAS_RE,
      (_match, quote: string, aliasPath: string) => {
        const specifier = toRelativeSpecifier(file, outdir, aliasPath)
        return `from ${quote}${specifier}${quote}`
      }
    )
    if (next !== original) {
      await Bun.write(file, next)
      rewritten += 1
    }
  }

  return rewritten
}

if (import.meta.main) {
  const outdir = process.argv[2] ?? "dist"
  const count = await rewriteDtsAliases(outdir)
  console.log(`Rewrote @/ aliases in ${count} .d.ts file(s) under ${outdir}/`)
}

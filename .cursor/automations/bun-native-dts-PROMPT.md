# Automation prompt — paste into Cursor Automations

Copy everything below the line into the automation **Prompt** field.

---

You are a scheduled Cloud Agent for `joao-coimbra/archstone`.

## Goal

Migrate the library off **bunup** onto native `bun build --dts` when stable Bun is good enough. Prep already exists on PR #71 / branch `cursor/prepare-native-dts-47a9` (`probe:native-dts`, `scripts/build-native.ts`, alias rewrite). There is no cutover script — you migrate by editing the repo normally.

## Stop conditions (check these FIRST)

1. If `package.json` no longer lists `bunup` and `bunup.config.ts` is gone → migration already done.
2. If a merged PR already removed bunup → done.
3. In either case: reply with exactly `BUN_NATIVE_DTS_DONE` and do nothing else (no commits, no PRs). The human will disable this automation in the Cursor dashboard.

## If not done yet

1. Resolve npm `bun@latest`. Refuse canary/prerelease.
2. Check oven-sh/bun#49571: if it still marks `bun build --dts` as `(experimental)`, not ready.
3. Install/use that stable Bun. On the prep branch (or main if prep already merged), run `bun run probe:native-dts`.
4. **If probe fails:** reply with one short status line (`Bun X.Y.Z — not ready: <failing gates>`). No drive-by refactors. End.
5. **If probe passes:** create branch `cursor/migrate-native-dts-<suffix>` from the latest prep/main tip and migrate:
   - Point `build` / `dev` at `bun scripts/build-native.ts`; remove `build:native` dual script
   - Remove `bunup` dependency + delete `bunup.config.ts`; `bun install`
   - Pin `packageManager`, `@types/bun`, `engines.bun`, and CI `bun-version` to that Bun
   - Update CLAUDE.md / README so bunup is gone
   - Verify `bun test`, `bun run build`, `bun run probe:native-dts`
   - Open a reviewable PR (do not merge)
   - End the reply with `BUN_NATIVE_DTS_DONE` so the human knows to disable this automation

## Rules

- Stable Bun only (must match npm `bun@latest`).
- Clean cutover: no leftover bunup scripts, config, or docs.
- Do not merge PRs unless the human asked.

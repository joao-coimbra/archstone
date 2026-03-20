# Archstone — AI Instructions

## Project Overview

Archstone is a **zero-dependency TypeScript library** that provides the architectural foundation for backend services based on Domain-Driven Design (DDD) and Clean Architecture. It ships reusable base classes, contracts, and utilities so consumer projects never write this boilerplate themselves.

The library is published to npm as `archstone` and exposes four entry points:

| Entry point | Layer |
|-------------|-------|
| `archstone` | re-exports everything |
| `archstone/core` | pure language utilities |
| `archstone/domain/enterprise` | domain model primitives |
| `archstone/domain/application` | orchestration contracts |

## Logical Architecture

Three layers, each with a strict dependency rule — inner layers never import outer ones:

```
┌─────────────────────────────────────────┐
│  infrastructure  (not in this repo)     │ ← database adapters, HTTP handlers
├─────────────────────────────────────────┤
│  domain / application                   │ ← use cases, repository interfaces
├─────────────────────────────────────────┤
│  domain / enterprise                    │ ← entities, aggregates, value objects
├─────────────────────────────────────────┤
│  core                                   │ ← Either, ValueObject, UniqueEntityId…
└─────────────────────────────────────────┘
```

Infrastructure implementations (database adapters, HTTP handlers) live outside this library — never add them here.

Each layer has its own `CLAUDE.md` with detailed rules. Start there when working inside a specific layer.

## Source Structure

```
src/
  core/                 ← see src/core/CLAUDE.md
  domain/
    enterprise/         ← see src/domain/enterprise/CLAUDE.md
    application/        ← see src/domain/application/CLAUDE.md
```

## Runtime & Tooling

Use **Bun** exclusively — never Node.js, npm, yarn, or pnpm.

| Task | Command |
|------|---------|
| Install dependencies | `bun install` |
| Run tests | `bun test` |
| Build | `bun run build` |
| Lint & format | `bun x ultracite fix` |
| Publish | `bun run release` |
| Bump version | `bun pm version patch\|minor\|major` |

## Path Aliases & Import Rules

`@/` resolves to `src/`. Always import from the **layer's index**, never from deep file paths — deep imports cause the dts bundler to inline type declarations and break TypeScript's nominal typing for consumers who mix sub-path imports.

```ts
// ✅ correct
import { Either } from "@/core/index.ts"
import { Entity } from "@/domain/enterprise/index.ts"

// ❌ wrong — deep path breaks dts bundling
import { Either } from "@/core/either.ts"
```

## Testing

Framework: `bun:test`. Test files are `*.spec.ts` co-located with their source file.

```ts
import { test, expect } from "bun:test"

test("example", () => {
  expect(1).toBe(1)
})
```

Use in-memory repository implementations for use case tests — never couple tests to a real database.

## Contributing Workflow

- Branch naming: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`
- Commit style: Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`)
- Every commit must pass `bun test` and `bun x ultracite fix` before pushing
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines

## Merge Procedure

- Always merge pull requests using **Squash and Merge** (`--squash`)
- Never `--delete-branch` — the repo auto-deletes merged branches
- Always sync master after merge

```bash
gh pr merge <number> --squash
git checkout master && git pull
```

### Branch Full Flow

```bash
git checkout -b <type>/<name>
# ... commits ...
git push -u origin <type>/<name>
gh pr create --title "<title>" --body "<body>"
gh pr merge <number> --squash
git checkout master && git pull
```

## Release Procedure

- Never `git push --tags` — pushes all local tags including unintended ones
- Never create git tags for RC versions — tag only stable releases
- Always use annotated tags (`-a`) — the Release GA reads the message as the GitHub Release body
- GA does **not** publish to npm — publish locally first, then tag
- Working tree must be clean before `bun pm version`

### Stable Release

**Tag message format** — the Release GA uses the tag message verbatim as the GitHub Release body. Write it as:

```
v<x.y.z> — <one-line summary of the release>

<one or two sentences describing the problem solved or the motivation>

Changes:
- <concrete change 1 — what was done and why it matters>
- <concrete change 2>
```

Example:

```
v1.3.1 — Add shouldRun flag to DomainEvents for test control

Adds a shouldRun property to DomainEventsImplementation so tests can disable
event dispatching without clearing and re-registering handlers. Also adds
afterEach isolation and dedicated shouldRun coverage to the spec.

Changes:
- Add shouldRun = true flag — set to false to suppress dispatch in tests
- Add afterEach cleanup (clearHandlers, clearMarkedAggregates, reset shouldRun)
- Add test asserting handlers are not called when shouldRun is false
```

```bash
bun pm version <x.y.z>
# bun pm version creates an annotated tag automatically, but with no changelog.
# Always delete and recreate it with a proper message before doing anything else:
git tag -d v<x.y.z>
git tag -a v<x.y.z> -m "v<x.y.z> — <summary>

<motivation paragraph>

Changes:
- change 1
- change 2"

bun run release                          # publishes to npm with dist-tag latest

git checkout -b release/v<x.y.z>
git push -u origin release/v<x.y.z>
gh pr create --title "chore: release v<x.y.z>" --body "..."
gh pr merge <number> --squash --auto     # auto-merges after CI passes
# wait for merge confirmation, then:
git checkout master && git pull

git push origin v<x.y.z>
```

### RC / Pre-release

```bash
bun pm version prerelease --preid rc
bun run release --tag next
# commit + push via PR — NO git tag for RCs
```

### dist-tags

| Tag | Use |
|-----|-----|
| `latest` | stable releases |
| `next` | RC / pre-release |

## Agent Skills for Consumer Projects

`skills/use-archstone/` ships with the package since v1.1.0 and can be installed into any consumer project:

```bash
bun x skills add joao-coimbra/archstone
```

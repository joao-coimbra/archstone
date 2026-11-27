# Contributing to Archstone

Thank you for your interest in contributing!

## Table of Contents

- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Architecture Rules](#architecture-rules)
- [Code Style](#code-style)
- [Commit Conventions](#commit-conventions)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Reporting Bugs

Open an issue at https://github.com/joao-coimbra/archstone/issues and include:

- Archstone version
- Minimal reproduction case
- Expected vs actual behavior

## Suggesting Features

Open a [GitHub Discussion](https://github.com/joao-coimbra/archstone/discussions) before implementing. This ensures alignment on design before effort is spent.

## Development Setup

Requirements: **Bun >= 1.4**

```bash
bun install
bun test
bun x ultracite fix   # format + lint
```

## Project Structure

```
src/
├── core/               # Language-level utilities — zero domain knowledge
└── domain/
    ├── enterprise/     # Pure domain model — entities, aggregates, events
    └── application/    # Orchestration — use cases & repository contracts
```

## Architecture Rules

- Never add infrastructure code (DB, HTTP, ORMs) to `src/` — this is a pure domain library
- Use cases must return `Either<Error, Value>` — never throw
- Entities must extend `Entity<Props>` or `AggregateRoot<Props>`
- Value objects must extend `ValueObject<Props>`
- Repository contracts are interfaces only in `domain/application/repositories/`
- New utilities in `core/` must have zero domain knowledge

## Code Style

Uses Biome via Ultracite. Run `bun x ultracite fix` before committing.

Formatter defaults: no semicolons, 2-space indent, double quotes.

## Commit Conventions

Follows [Conventional Commits](https://www.conventionalcommits.org/):

| Type       | When to use        |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `chore`    | Tooling or config  |
| `docs`     | Documentation only |
| `refactor` | No behavior change |
| `test`     | Tests only         |

## Documentation

`README.md` and `docs/tutorial.md` describe the same public API. When a public class, function, method, or signature changes, update both files in the same pull request.

Also update `skills/use-archstone/` when that change would make an agent generate the old pattern. See [AGENTS.md](./AGENTS.md).

## Pull Request Process

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes following the architecture rules above
3. If a public API or recommended pattern changed, update `README.md` and `docs/tutorial.md` so they still match the code and each other
4. Run `bun test` — all tests must pass
5. Run `bun x ultracite fix` — no lint errors
6. Open a PR with a clear description of what and why
7. PRs that add features should include tests

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).

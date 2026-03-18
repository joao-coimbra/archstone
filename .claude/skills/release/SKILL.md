---
name: release
description: Use before any version bump, npm publish, or git tag in this repo. Defines the exact release sequence for stable and RC releases.
---

## Rules

- Never use `git push --tags` — pushes all local tags including unwanted ones
- Never create git tags for RC versions
- Always use annotated tags (`-a`) — the Release GA reads the tag message as the GitHub Release body
- GA does **not** publish to npm — always publish locally before tagging
- Working tree must be clean before `bun pm version`

## Stable Release (RC → x.y.z)

```bash
# 1. Bump version
bun pm version <x.y.z>

# 2. Publish to npm (latest dist-tag)
bun run release

# 3. Push version bump via PR
git checkout -b release/v<x.y.z>
git push -u origin release/v<x.y.z>
gh pr create --title "chore: release v<x.y.z>" --body "..."
gh pr merge <number> --merge
git checkout master && git pull

# 4. Create annotated tag — message becomes the GitHub Release body
git tag -a v<x.y.z> -m "v<x.y.z>

- change 1
- change 2"

# 5. Push tag individually
git push origin v<x.y.z>
```

## RC / Pre-release

```bash
bun pm version prerelease --preid rc
bun run release --tag next
# commit + push via PR as normal — NO git tag
```

## dist-tags

| Tag | Use |
|-----|-----|
| `latest` | stable releases |
| `next` | RC / pre-release (never use `rc` — deprecated) |

## GA Workflows

- **CI**: runs on every master push and PR — lint + tests
- **Release**: triggers on `v*` tag push — builds, zips dist, creates GitHub Release using tag annotation as body

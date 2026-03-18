---
name: merge
description: Use before merging any PR in this repo. Defines the exact merge command and post-merge sync sequence.
---

## Rules

- Never use `--squash` — rewrites history and causes local divergence on `git pull`
- Never use `--delete-branch` — repo auto-deletes merged branches
- Always sync local master with `git pull` after merge

## Merge a PR

```bash
gh pr merge <number> --merge
git checkout master && git pull
```

## Feature / Fix / Docs Branch Full Flow

```bash
# Create branch
git checkout -b <type>/<name>

# ... commits ...

# Push and open PR
git push -u origin <type>/<name>
gh pr create --title "<title>" --body "<body>"

# Merge and sync
gh pr merge <number> --merge
git checkout master && git pull
```

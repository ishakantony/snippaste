---
name: merge-changes-from-worktree
description: Fast-forward merge a branch from an existing git worktree into the current branch after validating the source worktree and running project checks. Use when the user asks to merge changes from another worktree, merge an existing worktree branch, or invokes merge-changes-from-worktree with a branch argument.
---

# Merge Changes From Worktree

Merge a branch that is checked out in an existing git worktree into the current branch. The merge must be fast-forward only.

## Hard Rules

1. Only merge branches that are currently associated with an existing `git worktree` entry.
2. If the user did not provide a branch, discover supported branches and ask the user to choose using the Question tool.
3. Never use a normal merge commit. The final merge command must be `git merge --ff-only <branch>` or equivalent fast-forward-only command.
4. Before merging, run `bun run check:all` and `bun run test:e2e` from the source worktree. If either fails, stop and report the failure.
5. Do not discard, reset, or overwrite user changes. If a required worktree is dirty, ask before continuing.

## Quick Start

Given a branch argument:

```bash
git worktree list --porcelain
git status --short
bun run check:all
bun run test:e2e
git merge --ff-only feature-branch
```

Run project checks from the source worktree path, not from the target worktree, before the merge.

## Workflow

### 1. Identify Target And Source

- Treat the current branch in the current worktree as the merge target.
- List supported source branches with `git worktree list --porcelain`.
- A supported source branch is a branch shown by a `branch refs/heads/<name>` line.
- Exclude the current target branch from choices.
- If the user supplied a branch, validate that it exactly matches a supported source branch.
- If no branch was supplied, use the Question tool and present the supported source branch names.
- If there are no supported source branches, stop and report that no existing worktree branch is available to merge.

### 2. Validate Worktrees

- Check the current target worktree with `git status --short`.
- Check the source worktree with `git status --short` using the worktree path from `git worktree list --porcelain`.
- If either status is dirty, do not modify those changes. Ask the user whether to continue, stash manually, or stop.
- Confirm the source branch still resolves with `git rev-parse --verify <branch>`.

### 3. Prove Fast-Forward Is Possible

- Fetch remote refs if appropriate with `git fetch --all --prune`, unless the user asked for strictly local operations.
- Check ancestry from the target worktree: `git merge-base --is-ancestor HEAD <branch>`.
- If this succeeds, fast-forward is possible.
- If this fails, do not run a normal merge. Resolve by updating the source branch so it contains the target branch, preferably from the source worktree with `git rebase <target-branch>`.
- If rebase conflicts or requires destructive action, stop and ask the user. Do not auto-resolve conflicts by guessing.
- After any source-branch update, rerun the ancestry check.

### 4. Run Required Checks

From the source worktree path, run in order:

```bash
bun run check:all
bun run test:e2e
```

If either command fails, stop. Report the failing command and do not merge.

### 5. Merge Fast-Forward Only

From the target worktree:

```bash
git merge --ff-only <branch>
```

Then run `git status --short` and report the resulting HEAD branch and status.

## Failure Handling

- Unsupported branch: list supported worktree branches and ask the user to pick one.
- Dirty worktree: stop and ask; never stash or clean automatically.
- Fast-forward blocked: rebase the source branch onto the target only when the source worktree is clean and conflicts can be handled safely.
- Check failure: stop before merge and report the failing command.
- Merge failure: report the error and do not retry with non-fast-forward merge options.

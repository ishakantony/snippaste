---
name: commit
description: Stage changes, draft conventional commit messages, and commit with user confirmation. Use when user types /commit, asks to commit changes, or mentions creating a git commit.
---

# Commit

## Quick start

When user triggers `/commit` or asks to commit:

1. Run `git add -A` to stage all changes
2. Run `git status` and `git diff --staged` to review changes
3. Draft a conventional commit message (`type(scope): subject`)
4. Present summary + commit message to user
5. Ask for confirmation via `question` tool
6. If confirmed: `git commit -m "message"`

## Workflow

### 1. Stage all changes

Run `git add -A` to stage all modified, added, and deleted files.

### 2. Review changes

Run in parallel:
- `git status`
- `git diff --staged`
- `git log --oneline -5` (for context)

Identify:
- [ ] Modified, added, deleted files
- [ ] The nature of changes (feature, fix, refactor, docs, test, chore)

### 3. Draft commit message

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- **feat**: new feature
- **fix**: bug fix
- **docs**: documentation changes
- **style**: formatting, missing semicolons, etc.
- **refactor**: code change that neither fixes a bug nor adds a feature
- **test**: adding or correcting tests
- **chore**: build process, dependencies, tooling

Format: `type(scope): subject`

Rules:
- Subject is lowercase, no trailing period
- Max 50 chars for subject line
- Include body only if change needs explanation
- NEVER mention AI-generated, drafted by AI, or similar

### 4. Present to user

Show:
```
## Changes to be committed

<git status output>

## Proposed commit message

<type>(<scope>): <subject>

<type>: <description of why>
```

### 5. Ask for confirmation

Use the `question` tool with options:
- "Yes, commit" (Recommended)
- "Edit message first"
- "Cancel"

If user chooses "Edit message first", ask them to provide the new message, then re-present.

### 6. Execute

On confirmation, run `git commit -m "message"`.
If commit fails, show error and offer to fix.

## Safety rules

- NEVER use `git push` unless explicitly requested
- NEVER use `--no-verify` or skip hooks unless user asks
- NEVER commit `.env`, credentials, or secrets (warn user if detected)
- If working tree is clean, inform user there's nothing to commit

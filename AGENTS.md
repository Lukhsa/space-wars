# Space Wars Workspace Rules

## Writable project
- `space-wars` is the only repository Codex may modify unless explicitly instructed otherwise.

## Reference projects — READ ONLY
- `Space-Explorer-Web`
- `space-explorer-backend`
- `Space-Commute-RPG` if present

These projects belong to the existing Space Explorer production game.
Never commit, edit, reset, stash, clean, merge, switch branches, run migrations, or deploy anything in the reference repositories.

## Backend safety
Space Wars must use its own Supabase project and migrations.
Never connect Space Wars code to the production Space Explorer Supabase project.

## Reuse policy
Inspect and reuse proven architecture, patterns, algorithms, contracts, tests, and approved assets where appropriate, but copy/adapt them into Space Wars rather than creating runtime dependencies on the reference repositories.

## Current phase
Architecture and reuse audit first.
Do not attempt to build the entire game before the architecture has been reviewed.
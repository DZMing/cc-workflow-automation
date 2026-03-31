# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a minimal automation workspace. The only tracked project file today is `.claude/settings.local.json`, which defines local Codex permissions. Keep repository-specific configuration under `.claude/`. If you add executable logic, place reusable scripts in `scripts/`, long-form docs in `docs/`, and verification assets in `tests/` so the layout stays predictable from the start.

## Build, Test, and Development Commands

There is no application build pipeline yet. Use lightweight validation commands before opening a PR:

- `python3 -m json.tool .claude/settings.local.json >/dev/null` validates JSON syntax.
- `git diff --check` catches whitespace and merge-marker issues.
- `git status --short` confirms the exact files being changed.

If you add scripts, document their run command in this file and in the PR description.

## Coding Style & Naming Conventions

Use UTF-8 Markdown or JSON with 2-space indentation. Keep configuration keys stable and descriptive; prefer lowercase, dotted or camel-cased names already used by the target tool. Name new scripts by behavior, not implementation detail, for example `scripts/night-scan.sh` or `scripts/sync_rules.py`. Keep changes small and atomic; in this repo, a focused diff is preferred over broad cleanup.

## Testing Guidelines

No formal test framework is established yet, but every functional change still needs a verification step. For config changes, validate syntax and describe expected behavior in the PR. For shell scripts, run `bash -n path/to/script.sh`. For Python utilities, add a deterministic check under `tests/` or document a repeatable command that proves the change works. Do not merge unverified automation changes.

## Commit & Pull Request Guidelines

This repository has no published history yet, so start clean. Use short, imperative commit messages with a scope when helpful, such as `docs: add repository guidelines` or `chore: tighten codex permissions`. Keep each commit narrowly focused. PRs should include: purpose, files changed, validation commands run, and any follow-up work. Add screenshots only if a future change affects UI output.

## Security & Agent Notes

Treat `.claude/settings.local.json` as sensitive local configuration: do not add secrets, and do not widen permissions without a clear reason. If you work in a multi-agent flow, keep UI tasks separate from backend or automation logic, and prefer review before expanding tool access.

# AGENTS.md

## Project Overview

- Name: New project
- Harness profile: generic (until a real stack is introduced)
- Purpose: Feedback Loop, a desktop web service that reviews student
  submissions against course materials and accumulated instructor feedback.
- Primary language/framework: Not defined yet.

## Core Rules

- Treat the repository as the source of truth. Preserve its architecture,
  tools, package manager, naming, and conventions once they exist.
- Inspect the relevant files before editing and keep changes scoped to the
  requested behavior.
- Prefer nearby patterns and existing helpers over new abstractions.
- Do not overwrite, delete, or move files unless the task requires it and the
  reason is clear.
- Do not add a language, framework, package manager, service, or dependency
  until the project needs one.
- Treat `harness-starter-kit/` as a read-only local reference clone. Do not
  edit or commit it.
- Do not leave `temp_`, `_new`, `_old`, `_backup`, or `_fix` files behind.
- Never commit secrets, credentials, local environment files, or generated
  output.

## Commands

The current normal completion gate is:

```powershell
.\scripts\check_harness.ps1
git diff --check
```

When a real stack is introduced, document its exact format, lint, type-check,
test, and build commands here and include stable local checks in the normal
completion gate.

## Project Analysis Rule

When asked to analyze, review, summarize, onboard to, or explain this project,
inspect these first when they exist:

- `README.md`
- `AGENTS.md`
- `.harness/source.json`
- `docs/decisions/`
- `docs/conventions/`
- `docs/domain/`
- `docs/failures/`
- `docs/harness/`
- `scripts/check_harness.ps1`
- `scripts/check_*.py` or `scripts/check_*.ps1`

Then summarize structure, current behavior, tests, documentation, known
decisions, known failures, drift checks, and recommended next work.

## Directory And Architecture Rules

- Product code location: `frontend/` for the PC web UI and `backend/` for API,
  AI analysis, and file/data storage boundaries.
- Test location: not defined yet; document it with the first test runner.
- Product planning and durable decisions belong under `docs/`.
- Generated files, build output, local config, and vendored code must be
  explicitly identified before they are introduced.
- Do not create target-specific architecture rules until the target stack and
  actual boundaries are known.

## Knowledge Store

Before architectural, domain, workflow, or integration changes, inspect:

- `docs/decisions/`
- `docs/failures/`
- `docs/conventions/`
- `docs/domain/`

Add or update durable documentation when behavior, architecture, commands,
conventions, or known failures change. If a non-trivial change does not update
`docs/`, explain why in the final report.

Before finishing, check whether the change alters user workflow, input
contracts or semantics, state normalization, API shape, fallback policy, or
displayed decision criteria. If it does, add or update a decision record or
explain why one is not needed.

## Harness Commands

The local reference defines these prompt conventions:

- `/harness doctor` — inspect readiness without modifying files.
- `/harness adopt` — apply the smallest useful harness pieces.
- `/harness review` — review the current change set before commit.
- `/harness update` — refresh the reference and selectively update the target.
- `/harness refresh` — review stale or duplicated harness guidance.

These are workflow prompts, not assumed built-in shell commands.

## Completion Criteria

Before reporting completion:

- Run the documented checks relevant to the change.
- Add or update tests for behavior changes once a test runner exists.
- Keep live API, credential, visual, device, slow, and fragile checks outside
  the normal gate unless they become part of the repository's stable workflow.
- Confirm no temporary files or secrets were left behind.
- Update docs when behavior, architecture, commands, or known failures change.
- Summarize changed files, verification performed, assumptions, and remaining
  risks.

## Commit And PR Rules

- Use `feature/<short-kebab-case>`, `fix/<short-kebab-case>`,
  `docs/<short-kebab-case>`, or `chore/<short-kebab-case>` according to the
  change type.
- Open an issue before non-trivial work, keep one logical change per PR, and
  link the PR to its issue.
- Inspect `git status` and the staged diff before committing.
- Keep each commit focused on one logical change.
- Do not commit `harness-starter-kit/`, dependency directories, build output,
  caches, secrets, credentials, or machine-specific configuration.
- If no commit convention exists, use a clear imperative subject.
- PRs should summarize changed files, checks run, assumptions, remaining risks,
  and manual follow-up.
- See `docs/conventions/git-workflow.md` for the repository workflow and
  `.github/` for the issue and PR templates.

# Harness Adoption Report

## Target Repository Observed

- Stack and framework: none; repository was empty except for Git metadata.
- Package manager and commands: none. The initial normal gate is
  `scripts/check_harness.ps1` plus `git diff --check`.
- Local server, fixture, seed data, emulator, or device dependencies: none.
- Existing docs or agent instructions: none before adoption.
- CI or verification path: none before adoption.
- Monorepo or special layout: none.

## Files Added Or Changed

- `AGENTS.md`: project-neutral agent rules, analysis order, commands, and
  completion criteria.
- `.gitignore`: keeps the local reference clone and common local artifacts out
  of commits.
- `.harness/source.json`: records the adopted kit and source commit.
- `docs/conventions/coding.md`: placeholder for future stack conventions.
- `docs/domain/glossary.md`: placeholder for future domain language.
- `docs/decisions/README.md`: decision-record guidance.
- `docs/failures/README.md`: failure-memory guidance.
- `docs/harness/adoption-report.md`: this report.
- `scripts/check_harness.ps1`: lightweight local harness gate.

## Existing Structures Reused

- None; the target repository had no files or conventions to preserve.
- The generic profile and prompt-first adoption workflow from the local kit were
  adapted instead of copied wholesale.

## Checks Run

```powershell
.\scripts\check_harness.ps1
git diff --check
```

Result: pending until the files are written and the gate is executed.

## Verification Gate Placement

- Normal completion gate: `.\scripts\check_harness.ps1` and `git diff --check`.
- Deterministic behavior checks included: harness file presence, source JSON
  validity, required report sections, and temporary-file hygiene.
- Focused or manual checks: product tests, lint, type-check, build, runtime,
  API, visual, and deployment checks are deferred until a real stack exists.

## Server Or Fixture Verification

- Required: no; the target has no application or runtime dependency yet.
- Verification performed: not applicable.

## External API Verification

- Required: no; no external API or integration exists yet.

## Feature Scenario Test Note

- Broad feature work: no; this is repository harness setup.
- Build-only validation is enough: yes for this adoption because there is no
  product code or build system yet.

## Failure Memory

- Recorded: none.
- Skipped: adoption introduced no user-visible runtime failure or high-risk bug
  path.

## Documentation Updated

- `AGENTS.md`: added.
- `docs/conventions/coding.md`: added.
- `docs/decisions/`: guidance added; no ADR was needed for this setup.
- `docs/failures/`: guidance added; no failure record was needed.
- Behavior or integration decisions: none; no product behavior changed.

## Profile Absorption

- Profile reviewed: generic.
- Snippets adapted: agent rules and knowledge-store structure.
- Snippets skipped: language/framework profiles, package scripts, CI, and
  stack-specific checks because no stack exists.

## Drift Checks Added

- Baseline: `scripts/check_harness.ps1` checks required files, source tracking,
  report sections, and temporary-file hygiene.
- Encoding or localization hygiene: not added; no localized product source
  exists.
- Target-specific architecture checks: not added; no architecture exists yet.

## Effectiveness Measurement Plan

- Baseline available: no; there was no prior implementation work.
- Comparable tasks to track: the next five coding tasks after the first stack is
  introduced.
- Primary metric: first-pass verification success and wrong-file or out-of-scope
  edits.
- Review window: next five comparable agent tasks.
- Results location: `docs/effectiveness/` with task outcomes under
  `docs/effectiveness/task-outcomes/`.

## Assumptions

- The project will eventually choose its language and tooling; this adoption
  intentionally does not guess them.
- The local kit clone is useful during this setup but is not project source.

## Remaining Manual Steps

- Choose the first product/stack and update `AGENTS.md`, `README.md`, and the
  normal completion gate with real commands.
- Keep `./harness-starter-kit/` locally for future `/harness update` and
  `/harness refresh` prompts, but leave it ignored and uncommitted.

## Notes For Future Agents

- Start every substantial task by inspecting the knowledge store and the
  current diff.
- Convert repeated mistakes into a rule, check, decision, or failure record.
- After the first real stack is added, review the closest kit profile and run
  profile absorption rather than retaining generic placeholders.

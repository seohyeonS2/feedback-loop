# Git and GitHub Workflow

## Branches

- Keep `main` releasable and do not develop directly on it.
- Use `<short-kebab-case>` for feature, fix, and documentation branches.
- Create a branch for one logical change, such as
  `feedback-loop-dashboard`.
- Do not commit credentials, local environment files, generated output, or
  `harness-starter-kit/`.

## Issues

- Open an issue before non-trivial work.
- Describe the problem, intended outcome, scope, and acceptance criteria.
- Split unrelated work into separate issues.

## Commits

- Keep commits small enough to review and focused on one logical change.
- Use an imperative conventional prefix when useful:
  `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `style:`, or `chore:`.
- Do not commit every exploratory attempt; commit stable checkpoints.

## Pull requests

- Use one PR for one issue or one coherent change.
- Link the PR to its issue with `Closes #<number>` when the PR completes it.
- Include changed files, checks run, screenshots for UI changes, assumptions,
  and remaining risks.
- Review the diff and run the documented checks before merging.
- For solo development, the PR is still the review checkpoint before merging
  into `main`.

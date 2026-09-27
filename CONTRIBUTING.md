# Contributing to Catón AI

Thank you for your interest. This project holds itself to strict, automated quality gates; this
guide explains them so contributions pass review on the first attempt.

## Development setup

Requirements: **Node.js 24 LTS** or newer (see `.nvmrc`) and npm.

```sh
npm ci --ignore-scripts
npm run check
```

`npm run check` runs every gate that CI enforces. A change is only ready when it passes locally.

| Gate         | Command                | What it enforces                                                           |
| ------------ | ---------------------- | -------------------------------------------------------------------------- |
| Types        | `npm run typecheck`    | TypeScript `strictest` configuration, no `any`                             |
| Lint         | `npm run lint`         | typescript-eslint `strict-type-checked`, SonarJS, size and complexity caps |
| Format       | `npm run format:check` | Prettier                                                                   |
| Architecture | `npm run deps`         | Package encapsulation, no cycles, no undeclared dependencies               |
| Dead code    | `npm run knip`         | No unused files, exports or dependencies                                   |
| Tests        | `npm run test`         | Vitest with at least 90 % coverage                                         |

**Never weaken a gate to make a change pass.** If a rule is genuinely wrong for the codebase,
propose the change in its own pull request with an Architecture Decision Record.

## Code conventions

- Conventions follow the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html);
  the linter enforces what can be automated (for example, named exports only).
- Files stay small (at most 150 lines) and functions short (at most 30 lines, complexity 8).
- A package is used only through its public entry point (`src/index.ts`), imported by package name.
- TypeScript runs directly on Node (type stripping): only erasable syntax, `.ts` import
  specifiers, no build step.
- Amounts of money are integer minor units, never floating-point.

## Commits and pull requests

- Work on a branch and open a pull request; `main` only changes through reviewed pull requests.
- Pull requests are squash-merged, so the **PR title must follow
  [Conventional Commits](https://www.conventionalcommits.org/)** (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `build:`, `ci:`, `chore:`). CI validates it.
- Keep pull requests focused on one change.
- Required status checks are listed by name in the `main` ruleset (for example
  `check (node 24)`). Changing a job name or the Node matrix requires updating the ruleset
  first; otherwise every merge is blocked.

## Definition of done

- [ ] `npm run check` passes locally and in CI.
- [ ] New behaviour is covered by tests; bugs get a regression test.
- [ ] Public APIs are documented; docs and the README are updated if behaviour changed.
- [ ] Architectural decisions are recorded as an ADR in `docs/adr/`.
- [ ] Security and privacy impact has been considered (see `SECURITY.md`).

## Code review

Reviews follow [Google's code review guidelines](https://google.github.io/eng-practices/review/):
reviewers look at design, functionality, complexity, tests, naming, comments and documentation,
and approve changes that improve the overall health of the codebase.

## Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).

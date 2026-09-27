# 0011 — Engineering standards and quality gates

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

The project handles financial data and third-party code, and is meant to be a reference-quality
codebase. Standards that are not enforced automatically erode.

## Decision outcome

Every gate runs through `npm run check` locally and blocks merges in CI:

- **Types:** `@tsconfig/strictest`, no `any`.
- **Lint:** typescript-eslint `strict-type-checked` and `stylistic-type-checked`, SonarJS
  (cognitive complexity), files ≤ 150 lines, functions ≤ 30 lines, complexity ≤ 8, named exports
  only; conventions from the Google TypeScript Style Guide.
- **Architecture:** dependency-cruiser (public entry points only, no cycles, no undeclared or
  development dependencies in production code).
- **Dead code:** knip.
- **Tests:** Vitest with ≥ 90 % coverage.
- **Supply chain and security:** CodeQL, OpenSSF Scorecard, Dependabot, secret scanning with push
  protection, actions pinned by commit SHA, least-privilege workflow tokens.
- **Process:** `main` changes only through pull requests with required checks, linear history and
  squash merges; PR titles follow Conventional Commits.

Gates are never weakened to make a change pass; changing a rule requires its own ADR. Each gate
was verified to fail on a deliberate violation when introduced.

### Later milestones

Security targets for the first public release: OWASP Top 10 for LLM Applications (2025) mapping
and threat model, OpenSSF Best Practices badge, signed releases with provenance and SBOM. OWASP
ASVS level 2 is a target only once the product is offered to companies.

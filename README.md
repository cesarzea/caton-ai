# Catón AI

[![CI](https://github.com/cesarzea/caton-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/cesarzea/caton-ai/actions/workflows/ci.yml)
[![CodeQL](https://github.com/cesarzea/caton-ai/actions/workflows/codeql.yml/badge.svg)](https://github.com/cesarzea/caton-ai/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/cesarzea/caton-ai/badge)](https://scorecard.dev/viewer/?uri=github.com/cesarzea/caton-ai)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A local-first, plugin-based financial watchdog for individuals and small businesses.**

Catón AI connects to where your money actually goes — bank accounts, cards and the usage APIs of
the services you pay for — keeps everything on your own machine, and lets plugins and AI agents
watch it for you: budgets, goals, cash-flow forecasts, and alerts such as _"tell me when my
Anthropic spend goes over $20"_.

> **Status: pre-alpha.** This repository currently contains the engineering foundation only
> (tooling, quality gates and CI). There is no usable product yet.

## Why the name

Cato the Elder was the Roman censor famous for his austerity and for reprimanding waste. Catón AI
plays the same role for your finances: it keeps watch, and it tells you when something is off.

## Principles

- **Local-first and private.** Data and credentials stay on your machine. No telemetry.
- **Minimal core, everything else is a plugin.** Data sources, budgets, goals and watchdog agents
  are plugins, including the official ones.
- **Permissions, not trust.** Plugins declare what they can read, write and whether they may use
  the network; nothing gets network access by default.
- **Reviewed before activation.** Plugins are checked automatically — including an AI-assisted
  security and functionality review — before they touch your data.

## Documentation

- [Architecture (arc42 + C4)](docs/architecture/README.md)
- [Architecture Decision Records](docs/adr/README.md)

## Engineering standards

Every rule below is enforced automatically: `npm run check` runs them locally, CI runs them on
every pull request, and `main` cannot change unless they all pass. Each gate was verified to fail
on a deliberate violation when it was introduced.

**Code**

- TypeScript with [`@tsconfig/strictest`](https://github.com/tsconfig/bases); `any` is forbidden.
- [typescript-eslint](https://typescript-eslint.io) `strict-type-checked` and
  `stylistic-type-checked`, plus SonarJS cognitive-complexity rules.
- Small units: files of at most 150 lines, functions of at most 30 lines, cyclomatic complexity
  of at most 8, named exports only.
- Conventions from the
  [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html); formatting
  with Prettier.
- Architecture rules checked by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser):
  packages are used only through their public entry point, no dependency cycles, no undeclared
  dependencies and no development tooling in production code.
- Dead-code detection with [knip](https://knip.dev): no unused files, exports or dependencies.
- Tests with [Vitest](https://vitest.dev) and a minimum of 90 % coverage.

**Security and supply chain**

- [CodeQL](https://codeql.github.com) analysis (`security-and-quality`) on every pull request.
- [OpenSSF Scorecard](https://scorecard.dev) published on every change to `main`.
- Dependabot updates, secret scanning with push protection and private vulnerability reporting.
- GitHub Actions pinned by commit SHA, with least-privilege workflow tokens.

**Process**

- `main` changes only through pull requests with required checks (Node.js 24 and 26, CodeQL,
  PR title), linear history and squash merges.
- [Conventional Commits](https://www.conventionalcommits.org) for every commit on `main`.
- Code review following
  [Google's engineering practices](https://google.github.io/eng-practices/review/), with an
  explicit definition of done in [CONTRIBUTING.md](CONTRIBUTING.md).
- Architecture documented with [arc42](https://arc42.org) and [C4](https://c4model.com);
  decisions recorded as [MADR](https://adr.github.io/madr/) architecture decision records.

**Planned** (not yet in place)

- [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) mapping and a
  threat model.
- [OpenSSF Best Practices](https://www.bestpractices.dev) badge.
- Signed releases with SLSA provenance and an SBOM.
- Mutation testing of the accounting domain.
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
  level 2 before the product is offered to businesses.

## Development

Requires Node.js 24 LTS or newer.

```sh
npm ci --ignore-scripts
npm run check   # types, lint, format, architecture rules, dead code, tests + coverage
npm start       # runs the CLI directly from TypeScript sources (no build step)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the quality gates and conventions.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © César Zea

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

Enforced standards run through `npm run check` locally and in CI on every pull request; `main`
cannot change unless they all pass. Each gate was verified to fail on a deliberate violation when
it was introduced.

| Area              | Standard                                                                                                                                                        | Status   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Types             | TypeScript [`@tsconfig/strictest`](https://github.com/tsconfig/bases); `any` forbidden                                                                          | Enforced |
| Lint              | [typescript-eslint](https://typescript-eslint.io) `strict-type-checked` + `stylistic-type-checked`, SonarJS cognitive complexity                                | Enforced |
| Code size         | Files ≤ 150 lines, functions ≤ 30 lines, cyclomatic complexity ≤ 8, named exports only                                                                          | Enforced |
| Style             | [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) conventions; Prettier formatting                                              | Enforced |
| Architecture      | [dependency-cruiser](https://github.com/sverweij/dependency-cruiser): public entry points only, no cycles, no undeclared or dev dependencies in production code | Enforced |
| Dead code         | [knip](https://knip.dev): no unused files, exports or dependencies                                                                                              | Enforced |
| Tests             | [Vitest](https://vitest.dev) with ≥ 90 % coverage                                                                                                               | Enforced |
| Static analysis   | [CodeQL](https://codeql.github.com) `security-and-quality` on every pull request                                                                                | Enforced |
| Supply chain      | [OpenSSF Scorecard](https://scorecard.dev), Dependabot, actions pinned by commit SHA, least-privilege workflow tokens                                           | Enforced |
| Secrets           | Secret scanning with push protection; private vulnerability reporting                                                                                           | Enforced |
| Branch policy     | Pull requests only, required checks (Node.js 24 and 26, CodeQL, PR title), linear history, squash merges                                                        | Enforced |
| Commits           | [Conventional Commits](https://www.conventionalcommits.org)                                                                                                     | Enforced |
| Code review       | [Google engineering practices](https://google.github.io/eng-practices/review/) and a definition of done ([CONTRIBUTING](CONTRIBUTING.md))                       | Adopted  |
| Architecture docs | [arc42](https://arc42.org), [C4](https://c4model.com) and [MADR](https://adr.github.io/madr/) decision records                                                  | Adopted  |
| AI security       | [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) mapping and threat model                                                          | Planned  |
| Best practices    | [OpenSSF Best Practices](https://www.bestpractices.dev) badge                                                                                                   | Planned  |
| Releases          | Signed releases with SLSA provenance and SBOM                                                                                                                   | Planned  |
| Test quality      | Mutation testing of the accounting domain                                                                                                                       | Planned  |
| App security      | [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) level 2, before offering to businesses                              | Planned  |

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

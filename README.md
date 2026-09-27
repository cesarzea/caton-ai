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

> **Status: pre-alpha.** A first command-line version syncs European bank accounts through
> Enable Banking into a local ledger and reports monthly spend. Plugins, agents, alerts and the web
> UI are not built yet.

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

**Architecture and code**

| Standard                                                                                                                                                                                             | Status   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Architecture documented with [arc42](https://arc42.org) and [C4](https://c4model.com); decisions recorded as [MADR](https://adr.github.io/madr/) [architecture decision records](docs/adr/README.md) | Adopted  |
| Module boundaries checked by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser): public entry points only, no cycles, no undeclared or development dependencies in production code | Enforced |
| TypeScript [`@tsconfig/strictest`](https://github.com/tsconfig/bases); `any` forbidden                                                                                                               | Enforced |
| [typescript-eslint](https://typescript-eslint.io) `strict-type-checked` + `stylistic-type-checked`, SonarJS cognitive complexity                                                                     | Enforced |
| Tests with [Vitest](https://vitest.dev) and ≥ 90 % coverage                                                                                                                                          | Enforced |
| Small units: files ≤ 150 lines, functions ≤ 30 lines, cyclomatic complexity ≤ 8                                                                                                                      | Enforced |
| Dead-code detection with [knip](https://knip.dev): no unused files, exports or dependencies                                                                                                          | Enforced |
| [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) conventions (named exports only); Prettier formatting                                                              | Enforced |

**Security and supply chain**

| Standard                                                                                  | Status   |
| ----------------------------------------------------------------------------------------- | -------- |
| [OpenSSF Scorecard](https://scorecard.dev) published on every change to `main`            | Enforced |
| [CodeQL](https://codeql.github.com) `security-and-quality` analysis on every pull request | Enforced |
| GitHub Actions pinned by commit SHA, least-privilege workflow tokens                      | Enforced |
| Secret scanning with push protection; private vulnerability reporting                     | Enforced |
| Automated dependency updates with Dependabot                                              | Enforced |

**Process**

| Standard                                                                                                                                                             | Status   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Protected `main`: pull requests only, required checks (Node.js 24 and 26, CodeQL, PR title), linear history, squash merges                                           | Enforced |
| Code review following [Google's engineering practices](https://google.github.io/eng-practices/review/), with a definition of done in [CONTRIBUTING](CONTRIBUTING.md) | Adopted  |
| [Conventional Commits](https://www.conventionalcommits.org) for every commit on `main`                                                                               | Enforced |

**Planned**

| Standard                                                                                                                                       | Status  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| [OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/llm-top-10/) mapping and threat model                                         | Planned |
| [OpenSSF Best Practices](https://www.bestpractices.dev) badge                                                                                  | Planned |
| Signed releases with SLSA provenance and SBOM                                                                                                  | Planned |
| [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) level 2, before offering the product to businesses | Planned |
| Mutation testing of the accounting domain                                                                                                      | Planned |

## Getting started

Requires Node.js 24 LTS or newer and an [Enable Banking](https://enablebanking.com) application
in restricted mode with your own accounts linked and authorised (one session per bank).

Create `~/.config/caton-ai/config.json`, readable only by you (`chmod 600`):

```json
{
  "enableBanking": {"appId": "<application id>", "privateKeyPath": "~/.config/caton-ai/app.pem"},
  "connections": [{"name": "mybank", "sessionId": "<authorised session id>"}]
}
```

```sh
npm ci --ignore-scripts
npm start -- sync       # fetch accounts, movements and balances into the local ledger
npm start -- accounts   # accounts and latest balances
npm start -- spend 3    # money spent per month, last 3 months (cash basis)
npm start -- status     # last sync of every connection
```

Unattended PSD2 access allows only a few requests per account per day, so sync at most a few
times a day. Current limitations are tracked in [ADR 0012](docs/adr/0012-interim-local-secrets-and-ledger-storage.md).

## Development

Requires Node.js 24 LTS or newer.

```sh
npm ci --ignore-scripts
npm run check   # types, lint, format, architecture rules, dead code, tests + coverage
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the quality gates and conventions.

## Security

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © César Zea

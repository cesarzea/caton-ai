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

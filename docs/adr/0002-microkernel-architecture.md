# 0002 — Microkernel architecture: minimal core, everything else is a plugin

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Every person and company tracks different money flows: banks, cards, the usage APIs of AI and SaaS
providers, rent, internal systems. They also want different behaviour on top of that data:
budgets, goals, forecasts, watchdog agents. A monolith cannot anticipate all of it, and existing
open-source finance managers offer no plugin system.

## Decision drivers

- Adopters and companies must be able to add their own data sources and features.
- Features must be isolated so that a faulty or malicious extension cannot compromise the system.
- The core must stay small enough to be reviewed and secured thoroughly.

## Considered options

1. Monolith with built-in integrations.
2. Microkernel (plug-in) architecture: minimal core plus plugins.
3. Collection of independent services.

## Decision outcome

Chosen option: **2, microkernel**. The core owns only what every plugin needs and what affects
security: the ledger, sync engine, scheduler and event bus, plugin host, agent runtime,
notifications, shared domain services (currency conversion, categorisation, accounting views) and
the security layer. Data sources, budgets, goals and watchdog agents are plugins — including the
official ones, which prove that the plugin SDK is sufficient.

Inside each package, domain logic is kept independent of infrastructure (ports and adapters), and
packages depend on each other only through their public entry points (enforced by
dependency-cruiser).

### Consequences

- Good: extensibility for individuals and companies without forking.
- Good: a small, auditable core.
- Bad: the plugin SDK becomes a public contract that must be versioned with care (SemVer).
- Bad: designing plugin isolation and permissions is the hardest part of the system (see ADR 0006).

# 0003 — TypeScript on Node.js without a build step

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

The expected early adopters are developers. They distrust opaque compiled artefacts, switch Node
versions often and want to read the code they run. The bank connectivity layer being reused
(bank-mcp, ADR 0008) is written in TypeScript.

## Decision drivers

- Code that runs is the code that was reviewed: no transpiled output to trust.
- One language across core, plugins, MCP server and web UI.
- Strong static typing for financial logic.

## Decision outcome

TypeScript, executed directly by **Node.js 24 LTS or newer** using built-in type stripping.

- Only erasable syntax is allowed (`erasableSyntaxOnly`): no enums, namespaces or parameter
  properties.
- Relative imports use `.ts` specifiers; `tsc` runs with `noEmit` purely as a type checker.
- **TypeScript is pinned to 6.0.x**: typescript-eslint's type-aware rules support TypeScript < 6.1,
  so the native TypeScript 7 compiler cannot be adopted yet. Dependabot ignores it.

### Consequences

- Good: no build step for the application; the container runs the sources.
- Bad: packages published to npm in the future (for example the plugin SDK) must ship compiled
  JavaScript plus `.d.ts`, because Node does not strip types inside `node_modules`.
- Bad: the TypeScript 7 performance gains wait until the lint toolchain supports it.

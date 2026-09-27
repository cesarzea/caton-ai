# 0018 — Local web interface served by `caton serve`

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Setting Catón AI up from a terminal is hostile, and secrets typed there risk ending up in the
shell history. The product needs a web interface. It also needs a long-running process that
holds the unlocked secret store and, later, runs the scheduler: the passphrase mode of ADR 0017
cannot be unattended without one.

## Decision

- **One process, `caton serve`:** it serves the web interface and the local API, holds the
  secret store unlocked in memory, and will run the scheduler.
  - The store is unlocked once after start: from the web with the passphrase, or automatically
    when its key is a file or in the OS credential store.
  - `caton mcp` stays a separate stdio process started by MCP hosts.
- **Front end:** React, Vite and TypeScript in `packages/web`. It is the only package with a
  build step, a scoped exception to ADR 0003.
  - It talks to the server only through `@caton-ai/api`, a shared zod contract, so the two
    cannot drift apart.
  - No asset comes from a third party.
- **First scope:** unlocking and creating the store, managing secrets, and the status of every
  connection. A sync button, adding connections, dashboards and chat come later.
- **Security of a local server**, each point covered by a test:
  - **Address:** bound to `127.0.0.1` only.
  - **Host:** accepted only as `127.0.0.1:<port>` or `localhost:<port>`, against DNS
    rebinding.
  - **State-changing requests:**
    - `Origin` must be the server's own origin;
    - `Sec-Fetch-Site`, when present, must be `same-origin`;
    - bodies must be JSON and are size-capped;
    - no CORS headers are ever sent.
  - **Sign-in:**
    - `caton serve` prints a one-time link. Its token sits in the URL fragment, so it never
      reaches logs or `Referer` headers.
    - The token expires in ten minutes and is compared in constant time.
    - It is exchanged for a `HttpOnly; SameSite=Strict` session cookie.
    - Sessions live in memory: a restart signs everyone out.
  - **Headers:** a strict Content Security Policy (`default-src 'self'`,
    `frame-ancestors 'none'`), `nosniff`, `no-referrer`, same-origin opener and resource
    policies, and `no-store` caching.
  - **Static files:** served from a fixed table of built files, so path traversal is
    impossible.
  - **Secrets:** they can be written and deleted but never read. No response carries a value,
    and request bodies are never logged.
  - **Unlocking:** failures double the wait before the next attempt, up to a minute.

## Consequences

- Secrets and the passphrase are entered in a browser tab on the same computer, never in a
  terminal or a chat.
- Plain HTTP on the loopback interface rules out `Secure` and `__Host-` cookies. This is
  acceptable because traffic never leaves the machine. Remote access would require HTTPS and
  real authentication first.
- The `caton secrets` commands remain for headless machines and containers.

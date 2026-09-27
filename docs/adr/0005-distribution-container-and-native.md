# 0005 — Distribution: container first, native optional

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Catón AI must be easy to install, must not change much on the user's machine and must not impose
external dependencies. Developers — the likely first users — prefer containers to installers, and
accept Docker, Podman or Apple's `container` tool; non-technical users prefer a single app.

## Decision outcome

- **Primary:** an OCI container image built from the TypeScript sources (no compilation), running
  on Docker, Podman or Apple's `container`. Data lives in a mounted volume; the web UI and MCP
  endpoint bind to `127.0.0.1` by default and require a token.
- **Optional, later:** a native macOS app and Windows executable for non-technical users, and a
  macOS menu-bar widget as a thin client of the local API.
- Mobile is a client only (web app first); the core cannot run on phones.

### Consequences

- Good: isolation of third-party plugin code; the same image runs on every OS.
- Bad: inside a container there is no OS keychain, so secrets need an encrypted store or container
  secrets.
- Bad: exposing the container on a network requires authentication everywhere, never optional.

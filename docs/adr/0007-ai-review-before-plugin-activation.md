# 0007 — AI-assisted review before plugin activation

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Users will install plugins from third parties. Manual code review is not realistic for most of
them, and a malicious plugin would have access to their finances.

## Decision outcome

Before a plugin is activated, an option **enabled by default** reviews it:

1. **Deterministic checks first** (cannot be talked out of a result): declared permissions versus
   what the code actually does (network, filesystem, process spawning, dynamic evaluation), known
   vulnerable dependencies, install scripts, hash and signature against the marketplace index.
2. **AI review with Claude Code** in non-interactive mode, with read-only tools, no shell and no
   network: security (exfiltration, obfuscation, undeclared behaviour, prompt-injection surface)
   and functionality (does it do what it claims).
3. **A report with a verdict** (approved, warnings with file and line, blocked); the user decides.
   Updates review only the diff; reviews are cached by hash.

The AI verdict never overrides a failed deterministic check: the plugin under review is untrusted
input and may try to manipulate the reviewer. If Claude Code is not available, the configured LLM
is used; if none is available, the user is clearly warned that the plugin is unreviewed.

### Consequences

- Good: a strong, visible safety net for third-party code.
- Bad: each review costs tokens and minutes; this is shown to the user before it starts.

# Architecture Decision Records

Significant decisions are recorded here using the [MADR](https://adr.github.io/madr/) format.
A decision is **Accepted** only when the maintainer has explicitly taken it; options still under
discussion are marked **Proposed**.

| ADR                                                           | Title                                                         | Status   |
| ------------------------------------------------------------- | ------------------------------------------------------------- | -------- |
| [0001](0001-record-architecture-decisions.md)                 | Record architecture decisions                                 | Accepted |
| [0002](0002-microkernel-architecture.md)                      | Microkernel architecture: minimal core, plugins               | Accepted |
| [0003](0003-typescript-on-node-without-build.md)              | TypeScript on Node.js without a build step                    | Accepted |
| [0004](0004-sqlite-first.md)                                  | SQLite as the first storage engine                            | Accepted |
| [0005](0005-distribution-container-and-native.md)             | Distribution: container first, native optional                | Accepted |
| [0006](0006-plugin-permissions-and-isolation.md)              | Plugin permissions and isolation                              | Proposed |
| [0007](0007-ai-review-before-plugin-activation.md)            | AI-assisted review before plugin activation                   | Accepted |
| [0008](0008-bank-connectivity-via-bank-mcp-providers.md)      | Bank connectivity via the bank-mcp providers                  | Accepted |
| [0009](0009-configurable-llm-provider.md)                     | Configurable LLM provider                                     | Accepted |
| [0010](0010-no-email-ingestion-in-core.md)                    | No email ingestion in the core                                | Accepted |
| [0011](0011-engineering-quality-gates.md)                     | Engineering standards and quality gates                       | Accepted |
| [0012](0012-interim-local-secrets-and-ledger-storage.md)      | Interim storage of local secrets and the ledger               | Proposed |
| [0013](0013-read-only-mcp-server.md)                          | Read-only MCP server over the ledger                          | Proposed |
| [0014](0014-connector-plugin-contract.md)                     | Connector plugin contract                                     | Proposed |
| [0015](0015-email-alerts-connector.md)                        | Email documents connector                                     | Proposed |
| [0016](0016-financial-documents-and-reconciliation.md)        | Financial documents and reconciliation in the core            | Proposed |
| [0017](0017-secret-store.md)                                  | Secret store: age encryption, key kept where the user chooses | Accepted |
| [0018](0018-local-web-interface.md)                           | Local web interface served by `caton serve`                   | Accepted |
| [0019](0019-plugin-variables-instances-and-shared-secrets.md) | Plugin variables, instances and shared secrets                | Accepted |

## Writing a new ADR

Copy the structure of an existing record, number it sequentially, start it as **Proposed** and
open a pull request. Superseded records are kept and marked as such.

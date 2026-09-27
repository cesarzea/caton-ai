# 0001 — Record architecture decisions

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Catón AI is a platform that third parties will extend with plugins. Contributors, plugin authors
and adopters need to understand why the system is shaped the way it is, not only how.

## Decision outcome

Architecturally significant decisions are recorded as Markdown Architecture Decision Records
(MADR) in `docs/adr/`, and the overall architecture is described with the arc42 template and C4
diagrams in `docs/architecture/`. Any pull request that changes an accepted decision must add or
supersede an ADR.

### Consequences

- Good: decisions and their trade-offs survive beyond the conversations where they were made.
- Good: reviewers can check changes against explicit decisions.
- Bad: a small amount of writing overhead per significant change.

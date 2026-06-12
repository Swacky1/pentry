# Internal documentation

Contributor- and maintainer-facing docs. End-user documentation lives in
[`docs/`](../).

| Doc                                          | What's in it                                        |
| -------------------------------------------- | --------------------------------------------------- |
| [architecture.md](./architecture.md)         | How the pieces fit together, module map, invariants |
| [design-decisions.md](./design-decisions.md) | The "why" behind non-obvious choices (ADR-style)    |
| [check-authoring.md](./check-authoring.md)   | Conventions every built-in check follows            |
| [roadmap.md](./roadmap.md)                   | Direction, non-goals, how to propose changes        |
| [release-process.md](./release-process.md)   | Cutting and publishing a release                    |

New here? Read [architecture.md](./architecture.md) then
[design-decisions.md](./design-decisions.md) — together they explain not just how
Pentry works but why it's built the way it is. The two load-bearing principles
are **zero runtime dependencies** and **precision over coverage**; almost every
decision flows from those.

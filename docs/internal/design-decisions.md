# Design decisions

A running log of the "why" behind non-obvious choices. When you reverse one of
these, update the entry rather than deleting it.

## DD-1: Zero runtime dependencies

**Decision:** Pentry ships with no production dependencies.

**Why:** It's a security tool. Every transitive dependency is supply-chain risk
we'd be asking users to accept in exchange for finding _their_ risk — a bad
trade. Node 18+'s built-in `fetch`, `URL`, and `node:http` cover what we need.
Colors and arg-parsing are small enough to own. This is also a genuine
differentiator worth protecting.

**Cost:** We reimplement small conveniences (ANSI colors, CLI parsing). Accepted.

## DD-2: Test-suite-native, not a standalone scanner

**Decision:** The primary interface is `scan()` returning a report you assert on,
not a CLI-first scanner.

**Why:** The gap in the market isn't "another DAST tool" — it's security testing
that lives where developers already work. Owning the `expect(report.ok)` moment
is the whole thesis. The CLI is a convenience wrapper over the same core.

## DD-3: Default-deny on non-local targets

**Decision:** Refuse any target that isn't loopback/private unless `allowExternal`
is set.

**Why:** An npm-installable tool that actively sends attack-shaped requests must
make "only test what you own" the path of least resistance. The default protects
both users and bystanders, and keeps the project's intent unambiguous. The opt-in
exists for users' own staging/prod.

**Cost:** One extra flag for legitimate external scans. Worth it.

## DD-4: Precision over coverage

**Decision:** Ship fewer checks that are high-confidence rather than many noisy
ones. Findings must carry reproducible evidence.

**Why:** A scanner that cries wolf is deleted from CI within a week, and then it
protects nobody. Trust is the product. We'd rather miss a borderline issue than
emit a false positive that trains users to ignore us.

**Implication:** The V1 check set is deliberately small and skewed toward
checks with near-zero false positives (headers, cookies, declared-protected
routes). Riskier active checks (injection) come later and carefully.

## DD-5: `failOn` defaults to `medium`

**Decision:** Default threshold is `medium`.

**Why:** `info`/`low` findings (fingerprinting headers, missing `SameSite`) are
real but rarely worth failing a build on day one. `medium` catches things most
teams agree are worth fixing while keeping the first run from being a wall of red
that gets the tool disabled. Teams ratchet stricter as they clean up.

## DD-6: Checks are plain objects

**Decision:** A check is a `Check` object, not a class or a registered plugin.

**Why:** Lowest possible barrier to authoring one — the contribution we most want.
Built-ins and user checks are identical, so there's one code path and one mental
model. The registry is just an array.

## DD-7: Sequential execution in V1

**Decision:** Run checks and their requests sequentially.

**Why:** Predictable output ordering, gentle load on a dev server, and simpler
reasoning while the check set stabilizes. Parallelism is a known future
optimization behind a concurrency cap — we don't want to DoS a user's localhost.

## DD-8: SARIF + JUnit as first-class outputs

**Decision:** Support SARIF and JUnit in V1, not just JSON.

**Why:** These are the formats that make findings _appear_ in tools developers
already watch — GitHub's Security tab (SARIF) and CI test UIs (JUnit). Visibility
where people already look drives adoption more than a bespoke format.

## Open questions

- **Route discovery.** Should Pentry crawl/introspect routes (framework adapters)
  rather than requiring them to be declared? Big UX win, meaningful complexity.
  Tracked in the roadmap.
- **Auth flows.** Support login flows (submit form, capture cookie) beyond static
  tokens? Needed for realistic access-control testing at scale.
- **Stateful checks.** IDOR detection needs two identities to compare. Worth a
  dedicated context primitive?

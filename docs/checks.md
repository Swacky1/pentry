# Checks reference

Each built-in check is listed below with what it detects, its default severity,
whether it's passive or active, and how to fix the findings it raises.

> **Passive** checks only read normal responses. **Active** checks send crafted
> (but non-destructive) requests. Both are safe to run against your own app.

---

## `security-headers` — Security headers

**Passive.** Fetches `/` and verifies standard hardening response headers.

| Finding                                                              | Severity |
| -------------------------------------------------------------------- | -------- |
| Missing Content-Security-Policy                                      | medium   |
| Missing HSTS (HTTPS only)                                            | medium   |
| Missing/invalid X-Content-Type-Options                               | low      |
| No clickjacking protection (X-Frame-Options / CSP `frame-ancestors`) | medium   |
| Missing Referrer-Policy                                              | low      |

**Fix:** Set the headers at your app or reverse proxy. In Express, libraries like
`helmet` set sane defaults. HSTS findings only appear over HTTPS.

---

## `cookies` — Cookie security flags

**Passive.** Inspects every `Set-Cookie` on `/` for the three protective flags.

| Finding                              | Severity |
| ------------------------------------ | -------- |
| Cookie missing `HttpOnly`            | medium   |
| Cookie missing `Secure` (HTTPS only) | medium   |
| Cookie missing `SameSite`            | low      |

**Fix:** Set `HttpOnly; Secure; SameSite=Lax` on session/auth cookies.

---

## `info-disclosure` — Information disclosure

**Passive.** Flags response headers that reveal your stack and version.

| Finding                                         | Severity |
| ----------------------------------------------- | -------- |
| `Server` header leaks version                   | low      |
| `X-Powered-By` / `X-AspNet-Version` fingerprint | info     |

**Fix:** Strip or genericize these headers. In Express: `app.disable('x-powered-by')`.

---

## `cors` — CORS misconfiguration

**Active.** Sends a crafted `Origin` header to each route and inspects how the
server reflects it.

| Finding                                        | Severity |
| ---------------------------------------------- | -------- |
| Reflects arbitrary origin **with credentials** | critical |
| Reflects arbitrary origin (no credentials)     | medium   |
| Wildcard `*` combined with credentials         | low      |

**Fix:** Never reflect the `Origin` header. Validate it against a strict
allowlist and only echo known-good origins.

---

## `http-methods` — Dangerous HTTP methods

**Active.** Sends `TRACE`/`TRACK` requests to `/`.

| Finding                                      | Severity |
| -------------------------------------------- | -------- |
| `TRACE`/`TRACK` enabled (Cross-Site Tracing) | medium   |

**Fix:** Disable these methods at your web server or reverse proxy.

---

## `access-control` — Broken access control

**Active.** For each route you mark `protected: true`, sends an **unauthenticated**
request and flags any success response (i.e. not `401`/`403`/redirect).

| Finding                                | Severity |
| -------------------------------------- | -------- |
| Protected route reachable without auth | high     |

This check only runs when you declare protected routes, which keeps it
false-positive-free: you assert "this needs auth," and Pentry verifies it.

**Fix:** Enforce authentication/authorization server-side before returning data.

---

## `reflected-input` — Reflected input (potential XSS)

**Active.** Injects a unique, benign marker containing HTML metacharacters into a
query parameter and checks whether it's reflected **unencoded** into an HTML
response.

| Finding                                 | Severity |
| --------------------------------------- | -------- |
| Reflected input without output encoding | high     |

The marker never executes script — it only detects whether dangerous characters
survive intact, which is the precondition for reflected XSS.

**Fix:** Context-aware output encoding for all user input rendered into HTML.
Prefer auto-escaping templates plus a strict CSP as defense in depth.

---

## Selecting checks

```bash
# run only two checks
npx pentry scan http://localhost:3000 --only security-headers,cors

# run everything except one
npx pentry scan http://localhost:3000 --exclude info-disclosure
```

## Adding your own

See [writing-checks.md](./writing-checks.md). Custom checks run alongside (or
instead of) the built-ins and produce findings in the same format.

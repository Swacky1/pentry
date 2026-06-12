# Security Policy

## Responsible use of Pentry

Pentry actively sends crafted (non-destructive) requests to a target. **Only run
it against systems you own or are explicitly authorized to test.** Scanning
systems without permission may be illegal in your jurisdiction.

To make safe use the default, Pentry **refuses any target that isn't a loopback
or private address** unless you pass `--allow-external` (CLI) or set
`allowExternal: true`. That opt-in exists for _your own_ staging/production hosts
— not for third-party systems.

Pentry never performs destructive actions: no brute-forcing, no resource
exhaustion, no data mutation. If you find a built-in check that does, that's a
bug — please report it (see below).

## Reporting a vulnerability in Pentry

If you discover a security vulnerability **in Pentry itself**, please report it
privately rather than opening a public issue.

- Use [GitHub's private vulnerability reporting](https://github.com/Swacky1/pentry/security/advisories/new)
  ("Report a vulnerability" under the Security tab), or
- Email the maintainers (see repository profile).

Please include:

- A description of the issue and its impact.
- Steps to reproduce or a proof of concept.
- Affected version(s).

We aim to acknowledge reports within a few days and will keep you updated on
remediation. We'll credit you in the release notes unless you prefer to remain
anonymous.

## Supported versions

Until a 1.0 release, only the latest published version receives security fixes.

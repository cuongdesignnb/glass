# npm security advisories follow-up

## Boundary

This document tracks npm advisory triage as a separate security follow-up. Do not run `npm audit fix --force` inside performance PRs because forced upgrades can introduce unrelated framework and transitive dependency changes.

## Current status

PR1 local install reported npm advisories, but reachability and fixed-version impact have not yet been reviewed. The security follow-up PR must run a fresh `npm audit --json`, classify each advisory and choose minimal upgrades with regression coverage.

## Triage table

| Package | Severity | Direct/transitive | Runtime/dev-only | Reachable/not demonstrated | Fixed version | Breaking risk | Recommended PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD after fresh `npm audit --json` | TBD | TBD | TBD | TBD | TBD | TBD | Separate security PR |

## Required process

1. Run `npm audit --json` on the current target branch.
2. Group advisories by vulnerable package and dependency path.
3. Mark whether the package is direct or transitive.
4. Mark whether the vulnerable path ships to production runtime or is dev/build-only.
5. Check the fixed version and whether it requires a major framework/tooling upgrade.
6. Prefer minimal targeted upgrades or overrides when safe.
7. Run TypeScript, ESLint, build, performance contract tests and focused runtime smoke.
8. Keep this out of PR1/PR2A/PR2B unless a vulnerability is proven reachable in the changed performance code.

## Explicitly excluded

- No `npm audit fix --force` in performance PRs.
- No opportunistic major Next.js/React/tooling upgrade in PR2A.
- No advisory closure without fixed-version and regression-risk notes.

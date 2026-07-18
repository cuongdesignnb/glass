# PR1 Worktree Separation Evidence

Base SHA: `395adf006e20a56892b0159c737f780fa3217ca2`

PR1 branch: `perf/baseline-and-quick-wins`

Before splitting, the original `D:\glass` worktree was preserved in:

- `D:\glass-full-worktree-before-split.patch` (tracked changes, binary-capable)
- `D:\glass-index-before-split.patch` (empty because the index had no staged changes)

The original mixed worktree was not reset, checked out, cleaned, or stashed.

## Branding ownership retained only in the original worktree

- Favicon routes, deleted legacy icon set, manifest implementation, branding assets and branding resolver modules.
- Mitoo fallback names/icons and metadata/schema rewrites.
- Branding-specific media URL changes across public/admin pages.
- Branding backend settings/media/seeder changes and branding tests/configuration.
- `public/llms.txt`, admin branding UI, and favicon audit documentation.

None of these are included in the PR1 branch.

## Performance ownership moved to PR1

- Lighthouse/HTTP/bundle/browser evidence scripts and compact summaries.
- Newsletter deduplication and removal of the continuous placeholder timer.
- CartProvider consolidation, addon-aware line identity, and cart regression tests.
- Lazy Try-On modal plus focus/Escape accessibility behavior.
- Versioned service-worker retirement and project-prefix cache cleanup.
- Bundle analyzer configuration, lint gate, performance documentation, and build-gate fixes.

## Files that originally contained both task families

- `src/app/layout.tsx`: only the service-worker retirement hunk was moved; branding metadata/icon/schema hunks were excluded.
- `src/app/(public)/san-pham/[slug]/ProductDetailClient.tsx`: cart/Try-On hunks were moved; the Mitoo review-author fallback was excluded.
- `src/components/layout/Header.tsx`: CartProvider hunks were moved; the Mitoo logo alt fallback was excluded.
- `package.json` / `package-lock.json`: rebuilt from the base manifest with only PR1 scripts and `@next/bundle-analyzer`.
- `.gitignore`: only `.audit-evidence/` was added.
- `tsconfig.json`: `allowImportingTsExtensions` is required by the PR1 TypeScript tests.

## Ownership intentionally left unresolved/out of PR1

Local Docker/PHP test scaffolding (`Dockerfile`, backend Dockerfile, Composer binary, PHPUnit configuration/tests, backend Composer edits, and Compose edits) was not needed for PR1 and remains only in the original worktree. The ignored database dump is also outside PR1 scope.

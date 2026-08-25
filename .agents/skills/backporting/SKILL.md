---
name: backporting
description: How to backport a fix from `main` to a maintenance branch (`editor-v6.x`, `editor-v7.x`) in the Portable Text Editor monorepo. Use when a fix that shipped on `main` must also ship for an older major. Covers the branch layout, the verify-adapt-red-verify procedure, version-suffixed changesets, and the backport commit/PR shape, with real exemplars.
---

# Backporting fixes

## Branch layout

`main` carries the current major. Older majors live on maintenance branches named `editor-v<N>.x` (currently `editor-v6.x` and `editor-v7.x`). Each maintenance branch has its own working release pipeline: `release.yml` on that branch triggers on pushes to itself, and the changesets bot opens "Version Packages" PRs from `changeset-release/editor-v<N>.x`. Merging a backport PR that carries a changeset is all it takes; no manual publishing.

## When to backport

A fix lands on `main` and the bug also exists on an older line that consumers still run. Backporting is per-branch: a bug present on both v6 and v7 gets two backport PRs, one per branch (#2919 and the equivalent v7 port shipped separately).

## Procedure

1. **Worktree per backport**, branched off the maintenance branch: `git worktree add ../editor-<change>-v6 -b <change>-v6 origin/editor-v6.x`. Branch name is the change name with a `-v6`/`-v7` suffix. Run `pnpm install` and build the affected package before testing; the branch's dependency tree differs from `main`'s.
2. **Verify the branch carries the bug before porting anything.** Find the culprit commit on the branch (`git log` for the regression source) or run the fix's test against the unpatched branch and watch it fail. If the bug does not reproduce, there is nothing to backport; say so and stop.
3. **Port the fix, adapting to the branch.** Cherry-pick the `main` commit when it applies cleanly, otherwise re-apply by hand. The old line often differs structurally (different package splits, older APIs); each adaptation is deliberate and gets named in the commit and PR (#2919: the test imports `defineSchema` from the package root because v6 predates the `@portabletext/schema` split).
4. **Port the tests and red-verify on this branch.** The pinning tests come along and must fail on the unpatched branch, the same red-verification bar as `main` (see the `writing-tests` skill). "Red-verified on this branch" belongs in the commit body.
5. **Write a fresh changeset**, patch bump, slug suffixed with the line (`readonly-selection-sync-v6.md`). The consumer prose is the same as the `main` changeset (see the `changesets` skill); the release pipeline on the branch turns it into a patch release of the old major.
6. **Run the same gates as any change**: `pnpm check:types`, `check:lint`, the affected package's tests, `pnpm build`, root `check:format` and `check:knip`.

## Commit shape

Same subject as the `main` commit, no version suffix. The body opens with "Backport of the fix that shipped on main." and then carries the full mechanism prose per the `commits` skill; a backport body must stand on its own because the branch's history never contains the `main` commit. Close with the red-verification note and any branch adaptations. Exemplars: `7f2b3b5de` (v6), `76d57a094` (v7).

## PR shape

- Draft PR with `--base editor-v<N>.x`. Title is the commit subject, optionally suffixed "(v6)"/"(v7)" to disambiguate in PR lists (#3151, #2919).
- The body is the `main` PR's narrative, then a closing paragraph that names it a backport: "Backport of #NNNN to the `editor-v6.x` line", why the branch carries the bug (the culprit commit is present in which shipped version), and the adaptations. #2919's closing paragraph is the exemplar:

> Backport of #2918 to the `editor-v6.x` line, which carries the same regression (`2a3e03934`'s early return is present in 6.6.6). Same one-line gate yield, same two pinned scenarios, red-verified on this branch; the only adaptation is the test importing `defineSchema` from the package root since v6 predates the `@portabletext/schema` split.

## After merge

Nothing manual. The push to the maintenance branch triggers its release workflow, the changesets bot opens "Version Packages" on `changeset-release/editor-v<N>.x`, and merging that PR publishes the patch release of the old major.

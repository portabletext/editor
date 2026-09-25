---
name: next-branch
description: How the `next` prerelease branch for the upcoming editor major works in the Portable Text Editor monorepo. Use when targeting a PR at the next major, handling the `sync/main-into-next` PR or its conflicts, deciding whether to merge "Version Packages (next)", or cutting the stable major. Covers the one-direction sync, its timing, the conflict rule, prerelease cuts, the stable cut, and the repository settings the process relies on.
---

# The `next` branch

## Branch layout

`next` is the prerelease line for the upcoming editor major. It stays in changesets pre mode (`.changeset/pre.json`, tag `next`), so every release from it publishes a `-next.N` version under the `next` dist-tag. PRs for the next major target `next` (`--base next`). `main` keeps releasing the current major, and older majors live on maintenance branches (see the `backporting` skill).

`release.yml` runs on pushes to both `main` and `next`. On `next` the changesets bot opens "Version Packages (next)" from `changeset-release/next`.

## Syncing `main` into `next`

Sync runs one direction only: `main` into `next`, never the reverse until the stable cut. It always lands as a two-parent merge through the `sync/main-into-next` PR, which `sync-next.yml` opens (or refreshes) after each release of `main`. Merge that PR with "Create a merge commit". Never squash it, rebase it, or cherry-pick `main` commits onto `next` as routine. The merge commit is what records `main` as an ancestor of `next`. Without it, the next sync sees the same commits as unmerged, replays them, and hits the same conflicts again.

## Timing

Sync only after `main`'s Version Packages PR merges, never before. Until then `main` still holds pending changesets for a release that has not happened. Syncing then carries those changesets onto `next`, and the bot proposes prereleases of content that is about to ship stable from `main`.

`sync-next.yml` enforces this. It runs on every push to `main` (and on manual dispatch from `main`), but it never merges `main`'s tip blindly. It walks back from `main`'s tip along its first-parent history (up to 500 commits) and picks the newest commit with no pending changesets. That commit is the target, and the target is what gets merged. A pending changeset is any `.md` file anywhere under `.changeset/` except `README.md` files. That includes `.changeset/pre/`, where changesets v3 keeps prerelease changesets and where `pre exit` leaves them pending.

For example, after a release commit R, then c1 without a changeset, c2 adding one, and c3, the target is c1. The release and everything up to the first new changeset get synced. The rest waits for the next release.

The workflow skips with a one-line job summary when `next` does not exist, when no commit within reach is free of pending changesets, or when `next` already contains the target. So the push that merges Version Packages opens the sync PR, and a feature push re-syncs up to the newest clean commit, which does nothing when `next` already has it. Every run starts from `main`'s current tip, so a newer run that cancels an older one computes the same or a later target, and nothing is lost.

## When the workflow stops

The workflow never overwrites human work on `sync/main-into-next`. If the branch already contains both `next` and the target, it leaves the branch alone, so a hand-resolved merge survives later runs. If the branch has commits the workflow did not make and lacks `next` or the target, it pushes nothing and fails. Otherwise it rebuilds the branch from `next` and force-pushes with a lease on the SHA it fetched.

It also stops when the merge conflicts, and when its push is rejected. The push error is in the job log. Two likely causes: someone pushed to the branch during the run (the lease caught it), or GitHub refused a workflow file (the app token has no `workflows` permission, and a clean merge can produce `.github/workflows/` contents that exist on neither branch).

In all three cases the job summary carries the same commands, with the target filled in. For conflicts, keep `next`'s versions (the `version` fields in `package.json` files and the release headings in `CHANGELOG.md` files) and take `main`'s content. Finish in a dedicated worktree, based on `origin/sync/main-into-next` when the branch exists (so its work is kept) and on `origin/next` when it does not. Merge the current `next` first, so a branch that fell behind `next` catches up, then the target. `git worktree add -b` refuses to run when a local `sync/main-into-next` already exists, which protects unpushed work in it: reuse that branch, or delete it once it holds nothing worth keeping.

```sh
git fetch origin
git worktree add -b sync/main-into-next \
  ../editor-sync-main-into-next origin/sync/main-into-next
cd ../editor-sync-main-into-next
# if a merge stops on conflicts: resolve them, then
# `git add -A && git commit --no-edit`, then continue
git merge --no-edit origin/next
git merge --no-ff -m "chore: merge main into next" \
  <target>
git push origin sync/main-into-next
# if no sync PR is open:
gh pr create --base next --head sync/main-into-next \
  --title "chore: merge main into next" \
  --body 'Merge with "Create a merge commit".'
```

`<target>` is the commit the job summary names, usually `origin/main` right after a release.

## Prerelease PRs

Merge "Version Packages (next)" only to deliberately cut a `-next.N` prerelease. If everything in it already shipped stable from `main`, do not merge it. Let the sync land, then close the stale PR by hand. With zero changesets left on `next` the bot takes the publish path, which never updates or closes its old PR. It recreates the PR when the next changeset lands on `next`.

## Cutting the stable major

1. On `next`, run `pnpm changeset pre exit` and land it through a PR into `next`.
2. Merge `next` into `main` exactly once, as a merge commit. `main` requires linear history, so this one merge needs an admin bypass of that rule.
3. Let `main`'s Version Packages PR release the stable major.
4. Branch the old major's maintenance branch off its last stable tag, for example `git push origin '@portabletext/editor@<N>.x.y^{commit}:refs/heads/editor-v<N>.x'`.
5. The branch inherits a `release.yml` that triggers only on `main` and `next`. Through a PR into the maintenance branch, set its push trigger to the branch itself (`branches: [editor-v<N>.x]`, as on `editor-v7.x`). Backports release from the branch only after that lands.

## Repository settings

The process relies on three settings:

- Merge commits are enabled for the repository, so the sync PR can be merged as one.
- `main` keeps required linear history through the existing "Protect default branch" ruleset. The stable cut is the only merge commit it ever receives.
- A ruleset on `next` allows only the merge method, so no one can squash or rebase a sync PR by accident.

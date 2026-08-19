---
name: reviewing-prs
description: Review a PR in this repo against the house conventions before it is marked ready. Use when asked to review, pre-flight, or check a PR ("review this PR", "pre-flight", "is this PR ready"), and as a self-check before handing off any PR. Routes each artifact in the diff to its canonical skill (commits, changesets, writing-tests, code-comments, pr-descriptions) and verifies the PR's claims empirically instead of stylistically.
---

# Reviewing PTE PRs

This skill owns the review _procedure_. The rules live in the canonical
skills; read each one before auditing its artifact, and cite it in
findings. Never restate a rule from memory: memory is how drift starts.

## Gather

- `gh pr view <n>` (title, body, draft state) and `gh pr diff <n>`.
- `git log origin/main..HEAD --format='%h %s'` plus each commit's body.
- Bucket the changed files: source, tests, `.changeset/*.md`, docs, config.

## Route each artifact to its skill

Read the skill, then audit the artifact against it:

- **Commits** → `commits`: subjects name the mechanism; a commit carrying a
  changeset is `fix:`/`feat:`; contract pins sit in their own `test:`
  commit while regression tests ride the fix; no ticket IDs anywhere;
  `fixup!` discipline once in review.
- **Changesets** → `changesets`: present iff the change is user-facing;
  first line mirrors the commit subject verbatim; consumer-observable
  prose; rides-along deltas named explicitly.
- **Test files** → `writing-tests`: canonical suite placement; every
  integration test is its own `Scenario:`; deterministic keys; full-value
  `toEqual`; no sleeps; no summarizer indirection; comments held to the
  source-file bar.
- **Comments in the diff** → `code-comments`: default is no comment;
  why-only; nothing diff-relative; if the commit body already tells it,
  the comment is a duplicate and goes.
- **PR body** → `pr-descriptions`: draft state, narrative shape, no
  internal context, semantic deltas volunteered, body sized to the diff.

## Verify claims empirically

A stylistic pass is half a review. For every claim the PR makes, find the
evidence or produce it:

- A claimed regression test must be red pre-fix: check out the pre-fix
  source (or revert the fix hunks in the working tree) and run it, unless
  the PR or commit body records the red run.
- Run the gates the diff touches: `check:types`, `check:lint`,
  `check:format`, `check:knip`, and the affected package's test suites.
- Spot-check "full value" assertions for smuggled partial matchers.
- A named behavioral delta must have a test proving the _new_ behavior;
  an unnamed one found in the diff is a blocker, not a nit.

## Report

- Findings ordered: **blocker** / **should-fix** / **nit**. Each names
  `file:line`, the rule (skill and section), and the concrete fix.
- End with a verdict: ready to hand off, or the shortest list of changes
  that gets there.
- When asked to fix rather than report, apply the findings and re-run the
  gates; history is rewritten (fold, not append) while the PR is a draft.

## Anti-patterns

- Rubber-stamping with a summary of the diff instead of an audit.
- Restating skill rules from memory instead of reading the skill.
- Style opinions not backed by a skill: raise them as questions, not
  findings.
- Reviewing the investigation instead of the change: the diff, its
  commits, and its claims are the review surface.

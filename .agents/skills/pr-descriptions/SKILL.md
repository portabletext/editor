---
name: pr-descriptions
description: How to write pull request descriptions for the Portable Text Editor monorepo. Use whenever opening or editing a PR here. Covers the narrative shape (problem, diagnosis, fix), when to use headings, honesty about semantic deltas, and length that scales with the diff's blast radius, with real merged exemplars.
---

# Writing PTE PR descriptions

## Process

- **Before `gh pr create`, run the static checks CI runs**, from the worktree
  being pushed: `pnpm check:format`, `pnpm check:lint`, `pnpm check:types`,
  `pnpm check:knip` (repo root), plus the affected package's `test:unit`.
  These are cheap; run them all, every time.
  A green test run is not a green PR: lint enforces the house assertion
  style (see the `writing-tests` skill), and `test:unit` and `check:types`
  typecheck test files where stale API shapes surface.
- **Browser tests: complement AGENTS.md's per-package baseline.** A
  contained change may run just its own file (`vitest run --project
"browser (chromium)" tests/<file>.test.tsx`); a change with general blast
  radius (engine, selection, input pipeline) runs the package's full
  `test:browser:chromium`.
- **Always open as draft** (`gh pr create --draft`); a maintainer marks it
  ready and merges. Never `gh pr merge`.
- Title = the main commit subject (conventional format).
- Use `--body-file`, never a heredoc with backticks inside `$( )`: backticks
  in the body survive intact.
- The repo has no `PULL_REQUEST_TEMPLATE.md`, so the body is prose, not a
  form to fill in.
- **The description stands on its own: no internal context, ever.** No
  issue-tracker ticket IDs, no customer or partner names, no support
  threads, no Slack discussions, no "a user reported" or "requested by".
  Describe the observable failure or need itself ("the floating comment
  button intermittently fails to appear on the first selection"), never who
  reported or requested it. Related work is referenced by PR number or by
  naming the mechanism ("tracked separately as a follow-up"); the linked
  issue links to the PR, never the reverse. Ticket and support context
  lives wherever the work is tracked and in support channels, not in the
  PR.

## Shape

- **Fix/refactor PRs: heading-free narrative prose.** Problem → diagnosis in
  code terms → fix → what was verified. Larger feature PRs may use `## What`
  / `## Design notes`.
- **Lead with motivation**: the consumer pain that makes the change
  necessary, before the API or mechanism. The description stands on its own;
  explain the problem in terms of the code, not the PR graph, and reference
  another PR only when load-bearing.
- **Prose over bullets.** Each design decision gets a paragraph carrying its
  own reasoning; bullets flatten the why out. A short bullet list is
  acceptable only for genuinely parallel items (e.g. "things I was careful
  about").
- **No `## Tests` section.** A test inventory is listy and disconnected from
  the reasoning. Tests appear in the narrative next to the decision or claim
  they pin, "pinned" meaning a test that fails without the change ("pinned
  by a test expressing...").
- **Justify each non-obvious decision inline**, paired with the test that
  pins it.
- Fenced code examples when introducing API.
- Stacked or extracted PRs state why they are separate and what depends on
  them, referencing the other PR only when load-bearing (#2777: "Extracted
  from #2772 because it changes behavior for all existing `editor.on`
  events ... #2772 stacks on this").
- No generated-by footers, no emoji banners.

## Honesty

- Volunteer semantic deltas: a behavioral change nobody would catch in
  review gets its own sentence, even a narrow one.
- Say what is _not_ covered: an untested path, a case deliberately left out
  of scope.
- Perf numbers carry before/after and methodology (environment, run count,
  what was measured), never a bare percentage.
- **No boilerplate self-assessment.** "Type-only change", "no changeset
  needed" restate the diff; state something non-obvious about blast radius
  instead, or say nothing.

## Length: the budget

- **The body scales with the diff's blast radius, not the investigation's
  length.** Default for a fix PR: 3-4 short paragraphs, ~200 words: the
  failure, the design, the blast radius with its pin, one honest caveat.
  That ceiling is earned only by PRs with a genuinely large blast radius; it
  is not the template.
- **A trivial diff earns two sentences**: a verdict, and a rider naming
  anything else the diff also does. Zero citations, zero mechanics.
- **Everything cut must already live somewhere**: mechanism in the commit
  bodies, diagnosis narrative and decisions on the linked issue, specifics
  in the tests. The body is a map, not the territory.
- **When scope grows mid-PR, rewrite the body top to bottom: never append,
  and never patch just the sentences you remember; re-read the whole body
  and rewrite.** Appended addenda are how walls form, and patching only the
  remembered sentences is appending's twin: both skip the whole-document
  read. After any commit lands on, leaves, or is reworded on a branch with
  an open PR, re-read the entire body against the tip before pushing; stale
  claims survive wherever you patch from memory.
- **One-screen test**: after one screen the reviewer knows what changed,
  why, and what to scrutinize. If not, cut until they do.

## Exemplar: fix PR, heading-free narrative (#2774, merged)

> **fix(sanity-bridge): avoid combinatorial blow-up converting mutually-embedding types**
>
> While upgrading our studio from v4 to v5 we hit a complete freeze: opening any document with a portable text field would pin the main thread until the tab crashed. No errors, nothing in the console. We eventually traced it to `sanitySchemaToPortableTextSchema`.
>
> The walk added in #2630 tracks ancestors per branch, so it only stops when a type repeats within its own chain. Our schema has ~30 block object types, and about a dozen of them embed the shared `blockContent` array again (accordions, quotes, cards and so on). With that shape the walk ends up visiting every possible path through the type graph, which grows factorially with the number of block objects. For us that was ~2.1s per conversion — and since `PortableTextInput` converts on render, the studio just locked up. A slightly more connected schema never finishes at all.
>
> The fix relies on the fact that `Schema.compile` produces one canonical instance per named type [...] I added a small memo (scoped to one conversion call) keyed by the compiled type instance [...] which makes the walk linear in the size of the compiled schema.
>
> A few things I was careful about:
>
> - The memo key is the instance, not the name. Same-named inline declarations with different fields compile to distinct instances [...] the cases in `same-name-objects.test.ts` are unaffected.
> - Cycle detection via ancestor names is unchanged, and only completed expansions are memoized [...]
> - All 15 existing tests pass without modification. [...] output is byte-identical.
>
> Numbers: the new regression test (12 block objects sharing a named array type) runs in ~5ms with the fix. Without it, vitest times out [...] Against our production schema the conversion goes from 2,122ms to 1ms with identical output.
>
> One semantic note worth flagging: a memoized expansion is computed under the ancestor chain of wherever it was first reached. [...] No existing test pins a case where the difference is observable.

The merged PR body ends with a generated-by footer; that's the one part not
to copy — the anti-patterns below ban it.

Why it's canonical: opens with the lived symptom, diagnoses with the actual
growth mechanism, states the fix as an insight about the platform
(`Schema.compile` canonical instances), the careful-abouts each pair a
decision with the test guarding it, numbers have before/after + methodology,
and it **volunteers a semantic delta nobody would have caught in review**.

## Exemplar: feature PR with headings (#2772, merged)

Structure to copy (see https://github.com/portabletext/editor/pull/2772 for
the full text):

- `## What` opens with the concrete driver (Studio's render-pipeline work
  needs `listIndex`), generalizes to the class of consumers (derived state),
  then shows the API with a fenced example and the exact test pinning the
  motivating use case end-to-end.
- API-surface discipline gets its own paragraph: the closed five-variant
  union, the type-level tripwire that fails compilation when the engine
  vocabulary grows, the runtime allowlist, "exposing a future operation is a
  decision made twice, never an accident".
- `## Design notes` gives each contested decision a paragraph with its
  reasoning and its pinning test: why the stream is ungated (with the test
  pinning the contrast), delivery order under normalization (both real
  orders, which test pins which), error isolation, wildcard listeners.
- Performance measured and stated with methodology: "chromium, medians of 3
  runs, inserting 1000 blocks: 260ms vs 259ms [...] Parity within noise."

## Anti-patterns

- `## Tests` / `## Changes` inventory sections.
- Bullets where each item secretly needed a paragraph of why.
- "This PR fixes a bug in X" openings, open with the observable pain
  instead.
- Explaining the problem _only_ via the PR graph ("as discussed in #1234").
- Claiming coverage the tests didn't actually run; say what was and wasn't
  exercised.
- Self-assessments that restate the diff; generated-by footers.
- The investigation narrative leaking into the body: how the bug was found
  belongs wherever the work is tracked; the body describes the change.
- Appending paragraphs as the PR evolves instead of rewriting the body.

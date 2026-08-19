---
name: code-comments
description: How to write and review code comments in the Portable Text Editor monorepo. Use when writing code comments or judging comment quality. Covers the why-only rule, JSDoc-as-consumer-docs, and untouchable directives.
---

# PTE code comments

## The bar

A comment is a failure of every better channel. Before writing one, check where the information actually belongs:

1. **The code.** A name, an extracted helper, or a stronger assertion often removes the need. If the mechanism can be named, name it.
2. **The test.** Structure that an assertion defends needs no prose: deleting the "mysterious" line makes the pinned expectation fail, and the failure explains the line better than a comment would.
3. **The commit body.** Diagnosis, justification, comparison with what the code used to do: all diff-relative narrative lives there.
4. **Docs/skills.** A house pattern gets documented once, where it is defined, never re-explained at every use site. The same comment appearing N times is a pattern that wants a name, not N comments.

What remains after those four channels is the legitimate comment: the fact a competent reader **cannot recover from the code and would act wrongly without**: a browser quirk, a spec constraint, a deliberate-looking-accidental choice, an invariant the code relies on but does not check. "Explains why" is necessary but not sufficient; comprehension speed alone does not earn one. The test is concrete: what wrong action does this comment prevent? No answer, no comment.

## The rules

- Delete comments that restate the code. `// increment the counter` above `counter++` is noise. So is any comment a rename would make redundant.
- **Never reference ticket IDs (Linear, Jira, anything) in code comments.** The codebase stands on its own; a ticket system is invisible to external contributors, dies on migrations, and the commit that introduced the line already links the context. Name the CONDITION instead of the ticket: "once `merge` is a first-class operation, this becomes a correction", not "TICKET-123 promotes `merge`...". Same rule as commits, branches, and PRs.
- **Comments describe the present, never the diff.** A comment that argues for the new code against code that is no longer there ("Deterministic negative assert: ...", deterministic relative to a deleted sleep) is commit-body material wearing a comment's clothes. The tell: a label or contrast that only means something to someone who saw the old version.
- Comments for an if statement go **inside** the if statement, not above it.
- Use backticks around code identifiers: `` `markDefs` ``, not markDefs.
- Rewrites are dense one-liners where possible: present tense, mechanism not narrative, no "we need to" preamble. "Chrome collapses the selection on `blur`; restore it before applying" beats three sentences of story.
- A comment that mixes a real why with restated what gets rewritten down to the why, then re-tested against the bar: the residue must still prevent a wrong action, or it goes too.

## JSDoc is consumer documentation

JSDoc on exported symbols (especially `@public`) is rendered by typedoc onto portabletext.org. It is not a code comment; it is the docs site. Different bar entirely:

- The why-only rule does not apply. Describe behavior at the surface the consumer sees, not internal mechanism.
- Deleting or trimming it changes the published docs, so removal is an API-documentation decision, never comment cleanup. When it is wrong, improve it.
- `@example` blocks are valuable; keep and fix them rather than remove.
- `@deprecated` tags and their migration pointers are load-bearing API surface: consumers and tooling act on them. Keep them accurate.

## Not comments: machine-read directives

Some things look like comments but are instructions to tools, and editing or deleting them changes behavior (suppressed errors resurface, coverage changes, formatting shifts). The rules above do not apply to:

- Directives: `@ts-expect-error`, `@ts-ignore`, `biome-ignore`, `oxlint`, `eslint-disable`, `prettier-ignore`, `/// <reference`, `v8 ignore`, `c8 ignore`, `istanbul ignore`
- `keep-in-sync` pointers: they pin deliberate duplication across packages (see the `writing-tests` skill), and deleting one silently breaks the contract that keeps the copies aligned

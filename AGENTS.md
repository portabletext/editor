# AGENTS.md

Guidance for coding agents working on the Portable Text Editor monorepo.

## Working in the monorepo

- Packages live in `packages/*`, apps in `apps/*`. Run a package's scripts
  with `pnpm --filter @portabletext/editor <script>` from the root.
- A fresh checkout needs `pnpm install`, then
  `pnpm --filter '<package>...' build` before that package's tests pass.
- Before pushing, run the root checks CI runs: `pnpm check:format`,
  `pnpm check:lint`, `pnpm check:types`, `pnpm check:react-compiler`,
  `pnpm check:knip`, and the affected package's tests (`test:unit`,
  `test:browser:chromium`). `pnpm format` and `pnpm lint:fix` fix what
  their checks flag.

## Tests

- The file extension picks the runner: `.test.tsx` runs in the browser
  project, `.test.ts` in the unit project. Never encode the runner in a
  suffix like `.browser.test.tsx`.
- Unit tests sit next to the source file they cover in `src/`; browser
  tests live in the package's `tests/` directory.
- Before creating a test file, look for the existing home: most contracts
  already have a canonical suite (for example `tests/behavior-api.test.tsx`
  for Behavior API contracts in `packages/editor`).
- Use the package's existing harnesses and deterministic fixtures: keys come
  from `createTestKeyGenerator`, never hardcoded strings; example content is
  `foo`/`bar`/`baz`.
- Never wait with sleeps or fixed timeouts. Anchor every wait on something
  observable: `vi.waitFor` around a real assertion.
- Assert full values with `toEqual`, not fragments or partial matchers, and
  assert inline: no helper indirection that hides the expected value.
- A test that pins a fix must fail on the pre-fix code; run it against the
  old behavior to prove it.

## Comments

- The default is no comment. A comment earns its place only by telling the
  reader something the code and tests cannot: a browser quirk, a spec
  constraint, an invariant the code relies on but does not check.
- Comments explain why, never what, and never argue with code that is no
  longer there: a comment contrasting the current code with a deleted
  version belongs in the commit message.
- Comments for an `if` statement go inside it, not above it.

## Code style

- Use backticks around code identifiers in comments, commit messages, and
  docs.
- Use full, easily understood variable names; never one-character names.
- Type casting is a last resort.
- Place helper functions below the main functions they serve.
- Conditional rendering in JSX uses a ternary with an explicit `: null`,
  never `&&`.

## Commits and PRs

- Conventional commit subjects, lowercase, imperative, naming the
  actual mechanism, never the vague intent ("fix: selection bug"):
  `fix: only rewrite the DOM selection when it disagrees with the model`.
- User-facing changes ship a changeset (`.changeset/*.md`); tests, tooling,
  and internal refactors do not.

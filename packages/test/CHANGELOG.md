# @portabletext/test

## 2.1.0

### Minor Changes

- [#3209](https://github.com/portabletext/editor/pull/3209) [`433dd97`](https://github.com/portabletext/editor/commit/433dd97061b7d3b717b5facb21d2fa63e2ff9d4b) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `fromTextspec`, `toTextspec`, and `selectionFromTextspec`

  Write test seeds and assertions as textspec notation instead of block literals. `fromTextspec` parses notation into Portable Text blocks and a selection, deterministic under the supplied key generator:

  ```ts
  const {blocks, selection} = fromTextspec(
    {schema: compiledSchema, keyGenerator: createTestKeyGenerator()},
    'B: foo [strong:bar] b|az',
  )
  // blocks: one text block with spans 'foo ', 'bar' (strong), ' baz'
  // selection: collapsed after the 'b' in ' baz'
  ```

  `toTextspec` is the inverse: it serializes blocks and a selection back to one notation string, so an editor state can be asserted in a single `toEqual`. `selectionFromTextspec` resolves a pattern's selection markers (`|` caret, `^...|` range) against an existing value, for placing a selection in an editor that already has content.

  Both directions take an optional `containers` map to resolve container schemas. The supporting types (`TextspecContainers`, `TextspecContainerRegistration`, `TextspecSelection`, `TextspecSelectionPoint`) are exported; the editor's own `Containers` and `EditorSelection` satisfy them structurally.

## 2.0.0

### Major Changes

- [#3110](https://github.com/portabletext/editor/pull/3110) [`09aa881`](https://github.com/portabletext/editor/commit/09aa8813211bc26d1a75f94a2ff619fae6e132cb) Thanks [@christianhg](https://github.com/christianhg)! - feat!: drop the legacy `main` and `module` fields

  Every package now declares its entry points through the `exports` map only. Node, all maintained bundlers, and TypeScript (`moduleResolution: 'bundler'`, 'node16', or 'nodenext') resolve through `exports`; only tooling that predates `exports` support read `main` or `module` and can no longer resolve these packages.

- [#3106](https://github.com/portabletext/editor/pull/3106) [`3ce5a1d`](https://github.com/portabletext/editor/commit/3ce5a1d00caec9593a4f8d240d05df90505ca655) Thanks [@christianhg](https://github.com/christianhg)! - feat!: require node 22.12 or later

  Node.js 22.12 or later is now required. The previous range also allowed Node.js 20.19 and later; Node.js 20 reached end of life in April 2026 and is no longer supported. `@portabletext/editor` and `@portabletext/markdown` also move to `@portabletext/to-html` v6 and `@portabletext/toolkit` v6, which carry the same Node.js requirement.

## 1.0.5

### Patch Changes

- [#3042](https://github.com/portabletext/editor/pull/3042) [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c) Thanks [@stipsan](https://github.com/stipsan)! - fix: add a `module` entry point

  Every package now declares `module` alongside `main`, pointing at the ESM build.
  Bundlers that predate `exports` use it to pick the ESM output instead of falling
  back to `main`.

- [#3042](https://github.com/portabletext/editor/pull/3042) [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c) Thanks [@stipsan](https://github.com/stipsan)! - fix: publish an export map without the unresolvable `source` condition

  The published `exports` map carried a `source` condition pointing at
  `./src/index.ts`, which this package does not publish, so resolvers configured
  for that condition — bundlers and monorepo tooling — resolved to a file the
  tarball does not contain. The published map points at `dist` only now.

## 1.0.4

### Patch Changes

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

## 1.0.3

### Patch Changes

- [#2024](https://github.com/portabletext/editor/pull/2024) [`2ca1d79`](https://github.com/portabletext/editor/commit/2ca1d7922e75f2f046b99cc96b432dd1b0d98431) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove unused `@sanity/types` dependency

## 1.0.2

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

## 1.0.1

### Patch Changes

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Move `@sanity/types` to a regular dependency instead of a peer

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Use relative `^` semver for react compiler deps

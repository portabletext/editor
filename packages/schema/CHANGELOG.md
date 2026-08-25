# Changelog

## 3.0.0

### Major Changes

- [#3110](https://github.com/portabletext/editor/pull/3110) [`09aa881`](https://github.com/portabletext/editor/commit/09aa8813211bc26d1a75f94a2ff619fae6e132cb) Thanks [@christianhg](https://github.com/christianhg)! - feat!: drop the legacy `main` and `module` fields

  Every package now declares its entry points through the `exports` map only. Node, all maintained bundlers, and TypeScript (`moduleResolution: 'bundler'`, 'node16', or 'nodenext') resolve through `exports`; only tooling that predates `exports` support read `main` or `module` and can no longer resolve these packages.

- [#3106](https://github.com/portabletext/editor/pull/3106) [`3ce5a1d`](https://github.com/portabletext/editor/commit/3ce5a1d00caec9593a4f8d240d05df90505ca655) Thanks [@christianhg](https://github.com/christianhg)! - feat!: require node 22.12 or later

  Node.js 22.12 or later is now required. The previous range also allowed Node.js 20.19 and later; Node.js 20 reached end of life in April 2026 and is no longer supported. `@portabletext/editor` and `@portabletext/markdown` also move to `@portabletext/to-html` v6 and `@portabletext/toolkit` v6, which carry the same Node.js requirement.

## 2.2.4

### Patch Changes

- [#3042](https://github.com/portabletext/editor/pull/3042) [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c) Thanks [@stipsan](https://github.com/stipsan)! - fix: add a `module` entry point

  Every package now declares `module` alongside `main`, pointing at the ESM build.
  Bundlers that predate `exports` use it to pick the ESM output instead of falling
  back to `main`.

## 2.2.3

### Patch Changes

- [#2971](https://github.com/portabletext/editor/pull/2971) [`dd6b40c`](https://github.com/portabletext/editor/commit/dd6b40c3a34df1added8637e4163f4cd970ac310) Thanks [@christianhg](https://github.com/christianhg)! - fix: resolve bare `of` references against the schema's block objects in `getSubSchema`

  A container field's `of` can reference a type declared on the schema by bare name (`{type: 'list'}`), the shape recursive schemas require. `getSubSchema` previously resolved such a reference to a block object with no fields, so inserting or dropping one of these blocks inside a container stripped it to its `_type` and `_key`: a `list` nested inside a `list-item` lost its `kind` and `items`, an `image` dropped into a table cell lost its `src`. Referenced types now resolve to their declaration and keep their fields.

## 2.2.2

### Patch Changes

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

## 2.2.1

### Patch Changes

- [#2823](https://github.com/portabletext/editor/pull/2823) [`95e2b8d`](https://github.com/portabletext/editor/commit/95e2b8d51525adf5ff16a2930aee569a6f05da8a) Thanks [@christianhg](https://github.com/christianhg)! - fix: inherit a nested block's sub-schema from its enclosing container, not always the root

  A `{type: 'block'}` member nested inside a container now inherits any property it doesn't declare (`styles`, `decorators`, `annotations`, `lists`, `inlineObjects`) from the nearest enclosing container's block, falling back to the root only when no enclosing container declares a block of its own. Previously every absent property fell back to the root, so a block nested inside a container that restricts its own text (e.g. a callout limited to `strong`) could end up allowing more than its container. Schemas with single-level containers, or structural nesting where intermediate containers declare no block, are unaffected.

## 2.2.0

### Minor Changes

- [#2529](https://github.com/portabletext/editor/pull/2529) [`239e100`](https://github.com/portabletext/editor/commit/239e100b1760c0f20fdeefa659bd8c81c749d7a7) Thanks [@christianhg](https://github.com/christianhg)! - feat: resolve nested block sub-schemas at compile time

  A nested block declaration (e.g. a callout's text block, a code-block's line, a table cell's content) inherits the surrounding schema's decorators, annotations, styles, and lists by default. Inline overrides on the nested block (e.g. a code-block line declaring an empty `decorators: []` so bold doesn't apply inside code) are now resolved when the schema compiles, so every consumer of the schema sees the final per-position rules without having to walk the tree at runtime.

- [#2630](https://github.com/portabletext/editor/pull/2630) [`c6103e0`](https://github.com/portabletext/editor/commit/c6103e005a527c8e2717d9d8ad11da49cee9e942) Thanks [@christianhg](https://github.com/christianhg)! - feat: split `OfDefinition` into block, inline-object, and reference forms

  Inline object declarations in an array's `of` now use `type: 'object'` with a required `name`. References use just `type: '<typeName>'` with no fields. The block form (`type: 'block'`) is unchanged.

  This aligns the inline-declaration shape with Sanity's convention, where `name` is identity and `type` is meta-kind.

- [#2611](https://github.com/portabletext/editor/pull/2611) [`fea850c`](https://github.com/portabletext/editor/commit/fea850c5feab41097dc65f92b56e48b765257559) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `getSubSchema` to derive the resolved sub-schema for a container's `of` declaration

  Containers declare which types are allowed inside them via the `of` array on a child field. `getSubSchema(schema, of)` returns the resolved `Schema` view that applies inside such a container, so operations and validators that ask "what's allowed at this position?" can treat the result like any other top-level `Schema`.

  The `{type: 'block'}` entry (if present) supplies the resolved styles, decorators, annotations, lists, and inlineObjects. Non-block `of` members become the schema's block objects.

## 2.1.1

### Patch Changes

- [#2043](https://github.com/portabletext/editor/pull/2043) [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764) Thanks [@stipsan](https://github.com/stipsan)! - Implement `publishConfig.exports`

## 2.1.0

### Minor Changes

- [#2009](https://github.com/portabletext/editor/pull/2009) [`c2c566d`](https://github.com/portabletext/editor/commit/c2c566ddf3a47dcf3a089cce8375679942b920f8) Thanks [@christianhg](https://github.com/christianhg)! - feat: export `PortableTextChild` and `PortableTextListBlock`

## 2.0.1

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

## 2.0.0

### Major Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Require node v20.19 or later, or v22.12 or later

### Minor Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Remove CJS exports, this package is now ESM-only

### Patch Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade @sanity/pkg-utils to v9

## 1.2.0

### Minor Changes

- [#1591](https://github.com/portabletext/editor/pull/1591) [`7da6d79`](https://github.com/portabletext/editor/commit/7da6d790eab1566de522f65bf98410cc778fd303) Thanks [@christianhg](https://github.com/christianhg)! - Export common Portable Text types and type guards

## 1.1.0

### Minor Changes

- [#1578](https://github.com/portabletext/editor/pull/1578) [`1121f93`](https://github.com/portabletext/editor/commit/1121f9306b10481d10954f95211eed2ca20446f3) Thanks [@christianhg](https://github.com/christianhg)! - Support fields on the block type

## 1.0.1

### Patch Changes

- [#1542](https://github.com/portabletext/editor/pull/1542) [`7f1d5a2`](https://github.com/portabletext/editor/commit/7f1d5a2e7576e51cba249721e9279d1b42f8bd99) Thanks [@stipsan](https://github.com/stipsan)! - Update LICENSE year from 2024 to 2025

## 1.0.0 (2025-08-13)

### Features

- introduce `@portabletext/schema` package ([54a6b47](https://github.com/portabletext/editor/commit/54a6b47f5e1757cfb43fc04969ae4885b8146a4c))

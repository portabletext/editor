# Changelog

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

# Changelog

## 2.2.0

### Minor Changes

- [#2187](https://github.com/portabletext/editor/pull/2187) [`4d6be62`](https://github.com/portabletext/editor/commit/4d6be62f1c1299a8e6e094b34a113f587c998556) Thanks [@christianhg](https://github.com/christianhg)! - feat: add nested blocks schema support

  Add `nestedBlocks` to `Schema` and `SchemaDefinition` for block types that
  appear inside block objects (e.g. table cells containing Portable Text content).
  - `NestedBlockSchemaType` / `NestedBlockDefinition` for nested block types
  - `OfDefinition` discriminated union (`BlockOfDefinition` | `ObjectOfDefinition`)
    on `FieldDefinition.of` for array field member types
  - `compileSchema()` emits `nestedBlocks: []` for existing schemas (additive)
  - `sanitySchemaToPortableTextSchema()` walks block object fields recursively to
    detect objects containing array-of-blocks fields

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

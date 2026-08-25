# Changelog

## 3.0.0

### Major Changes

- [#3110](https://github.com/portabletext/editor/pull/3110) [`09aa881`](https://github.com/portabletext/editor/commit/09aa8813211bc26d1a75f94a2ff619fae6e132cb) Thanks [@christianhg](https://github.com/christianhg)! - feat!: drop the legacy `main` and `module` fields

  Every package now declares its entry points through the `exports` map only. Node, all maintained bundlers, and TypeScript (`moduleResolution: 'bundler'`, 'node16', or 'nodenext') resolve through `exports`; only tooling that predates `exports` support read `main` or `module` and can no longer resolve these packages.

- [#3106](https://github.com/portabletext/editor/pull/3106) [`3ce5a1d`](https://github.com/portabletext/editor/commit/3ce5a1d00caec9593a4f8d240d05df90505ca655) Thanks [@christianhg](https://github.com/christianhg)! - feat!: require node 22.12 or later

  Node.js 22.12 or later is now required. The previous range also allowed Node.js 20.19 and later; Node.js 20 reached end of life in April 2026 and is no longer supported. `@portabletext/editor` and `@portabletext/markdown` also move to `@portabletext/to-html` v6 and `@portabletext/toolkit` v6, which carry the same Node.js requirement.

## 2.1.4

### Patch Changes

- [#3042](https://github.com/portabletext/editor/pull/3042) [`cddbf04`](https://github.com/portabletext/editor/commit/cddbf041ded81ac7fe3ee6e5aed0869f014f420c) Thanks [@stipsan](https://github.com/stipsan)! - fix: add a `module` entry point

  Every package now declares `module` alongside `main`, pointing at the ESM build.
  Bundlers that predate `exports` use it to pick the ESM output instead of falling
  back to `main`.

## 2.1.3

### Patch Changes

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

## 2.1.2

### Patch Changes

- [#2043](https://github.com/portabletext/editor/pull/2043) [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764) Thanks [@stipsan](https://github.com/stipsan)! - Implement `publishConfig.exports`

## 2.1.1

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

## 2.1.0

### Minor Changes

- [#1851](https://github.com/portabletext/editor/pull/1851) [`53439a0`](https://github.com/portabletext/editor/commit/53439a0a1f0e623f8cf72294572c1723a9e407bd) Thanks [@christianhg](https://github.com/christianhg)! - feat: mark APIs as public

## 2.0.1

### Patch Changes

- [#1844](https://github.com/portabletext/editor/pull/1844) [`dd80369`](https://github.com/portabletext/editor/commit/dd80369dcb68b1d6910828a90a8ce5bf3e5fb5d6) Thanks [@stipsan](https://github.com/stipsan)! - fix: add support for react 18

## 2.0.0

### Major Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Require node v20.19 or later, or v22.12 or later

### Minor Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Remove CJS exports, this package is now ESM-only

### Patch Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade @sanity/pkg-utils to v9

## [1.1.1](https://github.com/portabletext/editor/compare/keyboard-shortcuts-v1.1.0...keyboard-shortcuts-v1.1.1) (2025-07-17)

### Bug Fixes

- use `rolldown` instead of `api-extractor` for dts generation ([#1445](https://github.com/portabletext/editor/issues/1445)) ([6dd6b51](https://github.com/portabletext/editor/commit/6dd6b51729b53479e9dd16fedbc8fc9bda73e6c1))

## [1.1.0](https://github.com/portabletext/editor/compare/keyboard-shortcuts-v1.0.0...keyboard-shortcuts-v1.1.0) (2025-07-09)

### Features

- export common `undo`/`redo` shortcuts ([f4115df](https://github.com/portabletext/editor/commit/f4115df8374e1d99066739483d5c5b6ab93f2b82))

### Bug Fixes

- **deps:** remove unneeded React deps ([a557e60](https://github.com/portabletext/editor/commit/a557e6006ccde8a2a3fb162ca970600abf11792a))

## 1.0.0 (2025-07-08)

### Features

- **`keyboard-shortcuts`:** export common shortcuts ([94b7132](https://github.com/portabletext/editor/commit/94b71321b03894bfe57f6bf7ca028e61dd1eb2b2))
- introduce `@portabletext/toolbar` and `@portabletext/keyboard-shortcuts` ([f263bae](https://github.com/portabletext/editor/commit/f263bae16a659b52a18bb8e0ec8b600e30756330))

### Bug Fixes

- **keyboard-shortcuts:** use "Opt" to describe `altKey` on Apple ([386877b](https://github.com/portabletext/editor/commit/386877be24fcf94375163b90fcdd21b4ead4e7d2))
- **toolbar:** improve keyboard shortcuts and add style shortcuts ([3cd538b](https://github.com/portabletext/editor/commit/3cd538b57ac48601fd5e8883584396adc047777f))

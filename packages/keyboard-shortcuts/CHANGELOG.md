# Changelog

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

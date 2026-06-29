# @portabletext/plugin-list-index

## 1.0.10

### Patch Changes

- Updated dependencies [[`1fbedd4`](https://github.com/portabletext/editor/commit/1fbedd4bf013fcb76dbcfb36b3e8d9fa3e163f39), [`e71e642`](https://github.com/portabletext/editor/commit/e71e642956c6b6988416a02ddf71db2dc53a9483), [`ed1845e`](https://github.com/portabletext/editor/commit/ed1845ef9c7075b58596405c62435de14389893e), [`39f9c40`](https://github.com/portabletext/editor/commit/39f9c406b371ce546df0629f9abc684941245c3c), [`cd56b64`](https://github.com/portabletext/editor/commit/cd56b641480a00125d098ff09472394aba631f13), [`46593d5`](https://github.com/portabletext/editor/commit/46593d537ff9d4aa1ef7f3e0ab3333266c749bbb)]:
  - @portabletext/editor@7.8.2

## 1.0.9

### Patch Changes

- Updated dependencies [[`8a84ef6`](https://github.com/portabletext/editor/commit/8a84ef66b97560d00884b63e41cc4d4dd5e90ce4)]:
  - @portabletext/editor@7.8.1

## 1.0.8

### Patch Changes

- [#2845](https://github.com/portabletext/editor/pull/2845) [`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

- Updated dependencies [[`6958b15`](https://github.com/portabletext/editor/commit/6958b15f6aba430a65630b2a6aef4db2d6eeb79e), [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645), [`4c41139`](https://github.com/portabletext/editor/commit/4c41139245fe2e496465a6ef46bbcd70f1ef56c9), [`80c6a80`](https://github.com/portabletext/editor/commit/80c6a8032c0295109c2729b4b9426fc31da59aa5)]:
  - @portabletext/editor@7.8.0

## 1.0.7

### Patch Changes

- [#2833](https://github.com/portabletext/editor/pull/2833) [`22c8939`](https://github.com/portabletext/editor/commit/22c893922cdc0be90814b70ac7170a8d46a71fbf) Thanks [@christianhg](https://github.com/christianhg)! - fix: coalesce list-index rebuilds via the editor's batched `editor.on`

  `ListIndexProvider` now rebuilds the list-index map through the editor's batched event delivery (`editor.on('operation', ..., {batch: true})`) instead of a private microtask scheduler. List numbering and the per-path re-render behavior of `useListIndex` are unchanged. The plugin now requires a version of `@portabletext/editor` whose `editor.on` supports batched delivery.

- Updated dependencies [[`38867cb`](https://github.com/portabletext/editor/commit/38867cb45f3c024cdb402a7caf98511121f88383), [`cdf16f9`](https://github.com/portabletext/editor/commit/cdf16f909eea6fdff36a49265884324e9881eaab), [`b268769`](https://github.com/portabletext/editor/commit/b26876928247ef3357b3c238dc069e569289e555), [`3aa6a39`](https://github.com/portabletext/editor/commit/3aa6a398534e71a01a9c711cbeb474eb815d4fdd)]:
  - @portabletext/editor@7.7.0

## 1.0.6

### Patch Changes

- Updated dependencies [[`29091fe`](https://github.com/portabletext/editor/commit/29091fe7c4d11c5bfc2907d24d921c3a0206bf8a)]:
  - @portabletext/editor@7.6.2

## 1.0.5

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.6.1

## 1.0.4

### Patch Changes

- [#2804](https://github.com/portabletext/editor/pull/2804) [`6aaafd8`](https://github.com/portabletext/editor/commit/6aaafd848adfef4877962bacd4fb9ad5c753f2bb) Thanks [@christianhg](https://github.com/christianhg)! - fix: number list items nested in containers

  `useListIndex` now returns an index for list items inside a container
  (for example a table cell), numbering within their own array and
  restarting at 1 in each. Previously `buildListIndexMap` walked only the
  top-level blocks, so cell-nested list items rendered unnumbered.

- Updated dependencies [[`2668d66`](https://github.com/portabletext/editor/commit/2668d66c7eb23bed7e4f5f6ad04ed6753f8a0d68), [`0768dc5`](https://github.com/portabletext/editor/commit/0768dc5ecff4a5ee90b58242f35a54ac3f6cfbb0), [`737d618`](https://github.com/portabletext/editor/commit/737d618ac78a3ae133701862861f03b9c39a3656)]:
  - @portabletext/editor@7.6.0

## 1.0.3

### Patch Changes

- Updated dependencies [[`c98ddb6`](https://github.com/portabletext/editor/commit/c98ddb6a99829cd6fb14b4b84b65b0857699f0a1)]:
  - @portabletext/editor@7.5.2

## 1.0.2

### Patch Changes

- Updated dependencies [[`68e1f0b`](https://github.com/portabletext/editor/commit/68e1f0b64e59c5923a8cd715cf4fbd59d16f011c)]:
  - @portabletext/editor@7.5.1

## 1.0.1

### Patch Changes

- Updated dependencies [[`5ee8bff`](https://github.com/portabletext/editor/commit/5ee8bffd81826885930b78c35144726fe36b7eb1)]:
  - @portabletext/editor@7.5.0

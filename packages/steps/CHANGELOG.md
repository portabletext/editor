# @portabletext/steps

## 1.0.2

### Patch Changes

- Updated dependencies [[`fe227d2`](https://github.com/portabletext/editor/commit/fe227d2fc048822f02543cae1201a05e2fe3a568)]:
  - @portabletext/patches@4.0.0
  - @portabletext/traversal@1.0.2

## 1.0.1

### Patch Changes

- [#3765](https://github.com/portabletext/editor/pull/3765) [`e145a79`](https://github.com/portabletext/editor/commit/e145a79ea31e4afb475daf5b8fbdf87c8254dc50) Thanks [@christianhg](https://github.com/christianhg)! - fix: use `@portabletext/traversal` for path helpers
  
  `@portabletext/steps` now depends on `@portabletext/traversal` and imports `isKeyedSegment`, `pathEquals` and `pathContains` from it instead of keeping its own copies. Behavior is unchanged.
- Updated dependencies [[`99979cf`](https://github.com/portabletext/editor/commit/99979cf5dc3c124ae210625363849418cce0ad8e), [`10d944b`](https://github.com/portabletext/editor/commit/10d944b9aca118ba71423a4fb990b5cf58513b7a)]:
  - @portabletext/patches@3.0.7
  - @portabletext/schema@3.1.2
  - @portabletext/traversal@1.0.1

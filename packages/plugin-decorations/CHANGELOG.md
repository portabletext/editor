# @portabletext/plugin-decorations

## 1.0.3

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.2`

## 1.0.2

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.1`

## 1.0.1

### Patch Changes

- [#3312](https://github.com/portabletext/editor/pull/3312) [`6ff4b31`](https://github.com/portabletext/editor/commit/6ff4b317b2553d5470025e2fd5fa364df8393445) Thanks [@christianhg](https://github.com/christianhg)! - fix: compare decoration positions by anchor and focus, ignoring extra selection keys
  
  A decoration registered with a range captured from an editor selection (carrying `backward`, in particular) could spuriously report a `moved` event for a burst that never actually changed its position, such as an edit that moves it and moves it back, or a same-length edit inside it. `current` also churned in the same cases, handing out a new array even though nothing moved. Both now compare positions by anchor and focus alone, matching the shape a transformed range always has.

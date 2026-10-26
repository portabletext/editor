# @portabletext/plugin-decorations

## 1.0.10-next.0

### Patch Changes

- Updated dependencies [[`e52a9d2`](https://github.com/portabletext/editor/commit/e52a9d24b73c71dee09ad7b039dc3de9dd62db50), [`12510bf`](https://github.com/portabletext/editor/commit/12510bf50d535af9f0c83e6a94990e2501efbec3)]:
  - @portabletext/editor@9.0.0-next.0

## 1.0.9

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.8`

## 1.0.8

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.7`

## 1.0.7

### Patch Changes

- [#3260](https://github.com/portabletext/editor/pull/3260) [`dabaea4`](https://github.com/portabletext/editor/commit/dabaea4a182054032a83324799a1d480cd2b7c9e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react to ^19.3.1

## 1.0.6

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.5`

## 1.0.5

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.4`

## 1.0.4

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.3`

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

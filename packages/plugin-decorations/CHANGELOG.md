# @portabletext/plugin-decorations

## 1.0.17-next.0

### Patch Changes

- Updated dependencies [[`216fb52`](https://github.com/portabletext/editor/commit/216fb5210eec66f79e6c070b218be1e23aa05f59), [`91d91a4`](https://github.com/portabletext/editor/commit/91d91a4af5e4a4c7f97eb340981a84afe43770c8), [`a8e5f6b`](https://github.com/portabletext/editor/commit/a8e5f6bef83793ed7885d5f61221eead8d79e90a), [`77b4cda`](https://github.com/portabletext/editor/commit/77b4cda5764d7b392d710c6578060d623b9e5507), [`be03281`](https://github.com/portabletext/editor/commit/be03281252910647eb369d18092bcfaa164cdea7), [`9758101`](https://github.com/portabletext/editor/commit/97581019a8024c583ea12e4ee4f998ec2aff2197), [`c822e68`](https://github.com/portabletext/editor/commit/c822e68640ec33342bb790909193300bbc3a330a), [`e4e4d1b`](https://github.com/portabletext/editor/commit/e4e4d1bc8cff842e5e4176979479a4bafc5061a8), [`0bab687`](https://github.com/portabletext/editor/commit/0bab6879efdd0443bb5d9295130927e64799190c), [`b3125b6`](https://github.com/portabletext/editor/commit/b3125b657a0b1d186b0a22f9224cea3db93c385c), [`e99d949`](https://github.com/portabletext/editor/commit/e99d9493249eb80078033527e523b7339340b2d4), [`b993cec`](https://github.com/portabletext/editor/commit/b993cec04e90ffaf0c44292a2671f6d6f026d5c9), [`0b3524c`](https://github.com/portabletext/editor/commit/0b3524c6aeb6bb0705de1d7b742708056b5c9509)]:
  - @portabletext/editor@9.0.0-next.0

## 1.0.16

### Patch Changes

- [#3714](https://github.com/portabletext/editor/pull/3714) [`732f001`](https://github.com/portabletext/editor/commit/732f001b7e3afa96222838661308747aef01c633) Thanks [@christianhg](https://github.com/christianhg)! - fix(plugin-decorations): point the npm homepage to www.portabletext.org
  
  The package's npm page now links to https://www.portabletext.org.

## 1.0.15

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.14`

## 1.0.14

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.13`

## 1.0.13

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.12`

## 1.0.12

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.11`

## 1.0.11

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.10`

## 1.0.10

### Patch Changes

- fix(deps): require `@portabletext/editor@^8.2.9`

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

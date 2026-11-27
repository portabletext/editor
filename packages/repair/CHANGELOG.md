# @portabletext/repair

## 2.0.0-next.0

### Major Changes

- [#3675](https://github.com/portabletext/editor/pull/3675) [`9b432f7`](https://github.com/portabletext/editor/commit/9b432f73f98c295d3946bc223ed383c02ecff785) Thanks [@christianhg](https://github.com/christianhg)! - feat!: remove non-object array entries
  
  A string, number, boolean, null or array entry in an array of objects is removed with one `unset` correction.
  
  A correction can now contain an `unset` patch. Code that applies corrections must handle `unset` as well as `set`. `StructuralRule` gains `'non-object'`, so an exhaustive switch over correction types needs a new case.

- [#3720](https://github.com/portabletext/editor/pull/3720) [`28b16ee`](https://github.com/portabletext/editor/commit/28b16eebb14eec3d42ce2cbfa38f66758ac2b950) Thanks [@christianhg](https://github.com/christianhg)! - fix!: stop setting span `text` outside a text block and text block `children` inside one
  
  `getStructuralCorrection` no longer returns a `span-text` correction for a span whose parent is missing or is not a text block, such as a span at the root or in a container field. It no longer returns a `missing-children` correction for a text block inside another text block. The `non-object`, `missing-type`, `missing-key` and `duplicate-key` rules are unchanged. Code that relied on those two corrections must apply them itself.
  
  ```ts
  getStructuralCorrection(context, {
    node: {_type: 'block', _key: 'b2'},
    path: [{_key: 'b1'}, 'children', {_key: 'b2'}],
    parent: {node: {_type: 'block', _key: 'b1', children: []}, path: [{_key: 'b1'}]},
    siblings: () => [],
  })
  // Previously: {type: 'missing-children', patches: [{type: 'set', path: [..., 'children'], value: []}]}
  // Now: undefined
  ```

## 1.0.4

### Patch Changes

- [#3714](https://github.com/portabletext/editor/pull/3714) [`93825ce`](https://github.com/portabletext/editor/commit/93825cee0216dd5d85a39ac20a0b9a7d68ef600e) Thanks [@christianhg](https://github.com/christianhg)! - fix(repair): point the npm homepage to www.portabletext.org
  
  The package's npm page now links to https://www.portabletext.org.
- Updated dependencies [[`20bfea0`](https://github.com/portabletext/editor/commit/20bfea025c45480b2046f7d6ae4ffc7c64945f03), [`4b15514`](https://github.com/portabletext/editor/commit/4b155140891f0b93ce56ae6b4f4eec0274d94dd7)]:
  - @portabletext/patches@3.0.6
  - @portabletext/schema@3.1.1

## 1.0.3

### Patch Changes

- Updated dependencies [[`ee00bd0`](https://github.com/portabletext/editor/commit/ee00bd04df1b2b00af581a2a48ad029cff505e48)]:
  - @portabletext/patches@3.0.5

## 1.0.2

### Patch Changes

- Updated dependencies [[`3729248`](https://github.com/portabletext/editor/commit/3729248acac220c3a5327ad9b85b6faf69aeda4d)]:
  - @portabletext/patches@3.0.4

## 1.0.1

### Patch Changes

- Updated dependencies [[`91e6bcb`](https://github.com/portabletext/editor/commit/91e6bcbe8871bd2af96de15ca6b279895dbdf2ea), [`59d4ee0`](https://github.com/portabletext/editor/commit/59d4ee0cf130ca791a3d4f7474d175b53c7a40a6)]:
  - @portabletext/patches@3.0.3

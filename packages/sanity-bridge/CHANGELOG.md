# Changelog

## 3.1.6

### Patch Changes

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

- Updated dependencies [[`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645)]:
  - @portabletext/schema@2.2.2

## 3.1.5

### Patch Changes

- Updated dependencies [[`95e2b8d`](https://github.com/portabletext/editor/commit/95e2b8d51525adf5ff16a2930aee569a6f05da8a)]:
  - @portabletext/schema@2.2.1

## 3.1.4

### Patch Changes

- [#2819](https://github.com/portabletext/editor/pull/2819) [`64ae058`](https://github.com/portabletext/editor/commit/64ae0588a59efbe329f47da51db0ccae1912cbb3) Thanks [@christianhg](https://github.com/christianhg)! - fix: resolve container block members from their own schema in `sanitySchemaToPortableTextSchema`

  A container block member now resolves its sub-schema from its own declared styles, decorators, annotations, lists, and inline objects. A code-block line that declares `of: []` no longer inherits the root block's inline objects, and a container that declares a same-named but differently-shaped annotation or inline object (e.g. a `widget` whose fields differ from the root's `widget`) keeps its own shape instead of the root's.

## 3.1.3

### Patch Changes

- [#2817](https://github.com/portabletext/editor/pull/2817) [`0cf0e97`](https://github.com/portabletext/editor/commit/0cf0e975d9707ca5a46c4e8e1f84974f6c690946) Thanks [@christianhg](https://github.com/christianhg)! - fix: preserve container block-member schema restrictions in `sanitySchemaToPortableTextSchema`

  Converting a Sanity schema with a container (e.g. a code block) whose block member restricts decorators, annotations, styles, or lists now carries those restrictions into the resulting sub-schema. Previously every restricted list fell back to the root schema, so schema-driven plugins like `@portabletext/plugin-markdown-shortcuts` and `@portabletext/plugin-character-pair-decorator` would fire inside the container (turning `# ` into a heading, `**bold**` into bold) and produce schema-invalid content.

## 3.1.2

### Patch Changes

- [#2781](https://github.com/portabletext/editor/pull/2781) [`78fef3d`](https://github.com/portabletext/editor/commit/78fef3d0210c0940274263bb4e853955b79dcb72) Thanks [@renovate](https://github.com/apps/renovate)! - Add changeset for the Sanity v6 dependency update.

## 3.1.1

### Patch Changes

- [#2774](https://github.com/portabletext/editor/pull/2774) [`ba0f5e9`](https://github.com/portabletext/editor/commit/ba0f5e99bd060dffd18bdc94f891ab0f820d5941) Thanks [@tfreeborough](https://github.com/tfreeborough)! - fix: avoid combinatorial blow-up converting mutually-embedding types

## 3.1.0

### Minor Changes

- [#2630](https://github.com/portabletext/editor/pull/2630) [`3a9fc2b`](https://github.com/portabletext/editor/commit/3a9fc2b2db364a3d46b30c02754f5cfa6bf8696c) Thanks [@christianhg](https://github.com/christianhg)! - feat: emit Sanity-aligned `OfDefinition` shape with cycle stubs

  The bridge now emits inline declarations as `{type: 'object', name: 'X', fields: [...]}` (matching `@portabletext/schema`'s grammar) and cycle stubs as bare references `{type: 'X'}`. Recursive Sanity schemas (where a type's `of` array contains itself) walk through ancestor-name cycle detection: the bridge inlines until it sees the type again, then emits a bare reference. The editor's resolver picks up the reference and terminates against its own ancestor chain. Two layers, same primitive.

### Patch Changes

- Updated dependencies [[`239e100`](https://github.com/portabletext/editor/commit/239e100b1760c0f20fdeefa659bd8c81c749d7a7), [`c6103e0`](https://github.com/portabletext/editor/commit/c6103e005a527c8e2717d9d8ad11da49cee9e942), [`fea850c`](https://github.com/portabletext/editor/commit/fea850c5feab41097dc65f92b56e48b765257559)]:
  - @portabletext/schema@2.2.0

## 3.0.0

### Major Changes

- [#2207](https://github.com/portabletext/editor/pull/2207) [`e83d990`](https://github.com/portabletext/editor/commit/e83d990c3f8db67fc7d33c653455c5ea52a19490) Thanks [@christianhg](https://github.com/christianhg)! - Remove `compileSchemaDefinitionToPortableTextMemberSchemaTypes`, `portableTextMemberSchemaTypesToSchema`, and the intermediate `PortableTextMemberSchemaTypes` conversion step from `sanitySchemaToPortableTextSchema`.

  `sanitySchemaToPortableTextSchema` now produces a PTE `Schema` directly from the Sanity schema without going through `PortableTextMemberSchemaTypes` as an intermediate representation.

  `createPortableTextMemberSchemaTypes` and the `PortableTextMemberSchemaTypes` type are still exported for consumers that need Sanity-specific schema types.

## 2.0.2

### Patch Changes

- [#2205](https://github.com/portabletext/editor/pull/2205) [`d095284`](https://github.com/portabletext/editor/commit/d095284d59ce0a3f1d4faf8836d9c9ddde817a46) Thanks [@christianhg](https://github.com/christianhg)! - fix: harden schema compilation against built-in name collisions and restore inline object type names

  Adds `file`, `slug`, and `geopoint` to the set of Sanity built-in names that need temporary names during `SanitySchema.compile()`. Without this, schemas using these names as block or inline objects get extra fields injected by the Sanity schema compiler.

  Fixes inline object `type.name` restoration for shared and built-in names. Previously only `inlineObject.name` was restored from the temporary name, leaving `inlineObject.type.name` with the `tmp-` prefix.

  Simplifies the name restoration pass to mutate shared references directly instead of mapping over `portableText.of` separately.

## 2.0.1

### Patch Changes

- [#2198](https://github.com/portabletext/editor/pull/2198) [`5f1b1fb`](https://github.com/portabletext/editor/commit/5f1b1fb44152f6fc9f674a917916d57fdf0496a7) Thanks [@christianhg](https://github.com/christianhg)! - fix: deduplicate shared block/inline object names in schema compilation

  When a type name appears in both `blockObjects` and `inlineObjects` of a `SchemaDefinition`, `compileSchemaDefinitionToPortableTextMemberSchemaTypes` would pass duplicate type names to `SanitySchema.compile()`, causing a "Duplicate type name added to schema" error. This generalizes the existing temporary-name pattern (previously only handling `image` and `url`) to dynamically detect and rename any shared names before compilation, then map them back afterward.

## 2.0.0

### Major Changes

- [#2043](https://github.com/portabletext/editor/pull/2043) [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764) Thanks [@stipsan](https://github.com/stipsan)! - Require v5 of sanity studio dependencies

### Patch Changes

- Updated dependencies [[`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764)]:
  - @portabletext/schema@2.1.1

## 1.2.14

### Patch Changes

- Updated dependencies [[`c2c566d`](https://github.com/portabletext/editor/commit/c2c566ddf3a47dcf3a089cce8375679942b920f8)]:
  - @portabletext/schema@2.1.0

## 1.2.13

### Patch Changes

- [#1969](https://github.com/portabletext/editor/pull/1969) [`4931b87`](https://github.com/portabletext/editor/commit/4931b87a595b0876db72e5e58650af5047d58754) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove `lodash` dependency
  1. Simple `lodash` usages like `uniq` and `flatten` have been replaced with
     vanilla alternatives.
  2. Many cases of `isEqual` have been replaced by new domain-specific equality
     functions.
  3. Remaining, generic deep equality checks have been replaced by a copy/pasted
     version of `remeda`s `isDeepEqual`.

  This reduces bundle size and dependency surface while improving type-safety and
  maintainability.

## 1.2.12

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

- Updated dependencies [[`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da)]:
  - @portabletext/schema@2.0.1

## 1.2.11

### Patch Changes

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Move `@sanity/schema` to a regular dependency instead of a peer

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Move `@sanity/types` to a regular dependency instead of a peer

- [#1981](https://github.com/portabletext/editor/pull/1981) [`23e9930`](https://github.com/portabletext/editor/commit/23e993070ead298cde133970746cb41f3fa571d6) Thanks [@stipsan](https://github.com/stipsan)! - Use relative `^` semver for react compiler deps

## 1.2.10

### Patch Changes

- [#1961](https://github.com/portabletext/editor/pull/1961) [`b99833c`](https://github.com/portabletext/editor/commit/b99833c77502e8f1bfa59c80522b2ee22585a8b6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @sanity/schema to ^4.20.3

## 1.2.9

### Patch Changes

- [#1955](https://github.com/portabletext/editor/pull/1955) [`5aff467`](https://github.com/portabletext/editor/commit/5aff467d3a0a607514224edcc2ed6ea3a8b17b4b) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.2

- [#1957](https://github.com/portabletext/editor/pull/1957) [`4be12e4`](https://github.com/portabletext/editor/commit/4be12e44447d8dc749c8efe4e76de26f4c0300f6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency @sanity/types to ^4.20.3

## 1.2.8

### Patch Changes

- [#1933](https://github.com/portabletext/editor/pull/1933) [`ba5c3f6`](https://github.com/portabletext/editor/commit/ba5c3f6943f4d23ba102b97fedf4fa7e787ca6e6) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.1

## 1.2.7

### Patch Changes

- [#1930](https://github.com/portabletext/editor/pull/1930) [`d7a7c89`](https://github.com/portabletext/editor/commit/d7a7c892b929194dcc335a7e291e0a9c20c5160e) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.20.0

## 1.2.6

### Patch Changes

- [#1913](https://github.com/portabletext/editor/pull/1913) [`cb190ec`](https://github.com/portabletext/editor/commit/cb190ec4d90e7ba2b4805e993b138436f7c1c83b) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.19.0

## 1.2.5

### Patch Changes

- [#1908](https://github.com/portabletext/editor/pull/1908) [`5fec0bd`](https://github.com/portabletext/editor/commit/5fec0bdefe69bef404037c57e7668e049434fc06) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.18.0

## 1.2.4

### Patch Changes

- [#1904](https://github.com/portabletext/editor/pull/1904) [`72f4cfb`](https://github.com/portabletext/editor/commit/72f4cfb74101aa176a094f440b81a51b748333c8) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.17.0

## 1.2.3

### Patch Changes

- [#1875](https://github.com/portabletext/editor/pull/1875) [`9ac5955`](https://github.com/portabletext/editor/commit/9ac5955011432373fb1eddf1e9501ea9d49cb667) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.16.0

## 1.2.2

### Patch Changes

- [#1858](https://github.com/portabletext/editor/pull/1858) [`746acd3`](https://github.com/portabletext/editor/commit/746acd3a64cd8d05ee171e069f2a20c35a4e1ccf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.14.2

## 1.2.1

### Patch Changes

- [#1843](https://github.com/portabletext/editor/pull/1843) [`c0075a3`](https://github.com/portabletext/editor/commit/c0075a34e2d17a2616461ac6789daf52740926c1) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.14.1

## 1.2.0

### Minor Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Remove CJS exports, this package is now ESM-only

### Patch Changes

- [#1814](https://github.com/portabletext/editor/pull/1814) [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade @sanity/pkg-utils to v9

- [#1808](https://github.com/portabletext/editor/pull/1808) [`e7f0d69`](https://github.com/portabletext/editor/commit/e7f0d6993abbdf2a6aeecad22bab970c0810eca1) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.13.0

- Updated dependencies [[`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89), [`e3c26cb`](https://github.com/portabletext/editor/commit/e3c26cb4a68fdc3e563f9b025c4af04678202b89)]:
  - @portabletext/schema@2.0.0

## 1.1.17

### Patch Changes

- [#1799](https://github.com/portabletext/editor/pull/1799) [`ab4ac2d`](https://github.com/portabletext/editor/commit/ab4ac2d5dd29c65cdab7c328bdae70665d36bb9e) Thanks [@chuttam](https://github.com/chuttam)! - fix: remove `get-random-values-esm`

## 1.1.16

### Patch Changes

- [#1788](https://github.com/portabletext/editor/pull/1788) [`5f4cac4`](https://github.com/portabletext/editor/commit/5f4cac440d766cf8415e7392dc9f72e6327fdb8c) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.12.0

## 1.1.15

### Patch Changes

- [#1757](https://github.com/portabletext/editor/pull/1757) [`657f0e1`](https://github.com/portabletext/editor/commit/657f0e13138f51f1c8aa5a249b9c2ffa0fe0fb65) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.11.0

## 1.1.14

### Patch Changes

- [#1729](https://github.com/portabletext/editor/pull/1729) [`7eab00e`](https://github.com/portabletext/editor/commit/7eab00ee9b1f1186fdac76210daa1953edc2847c) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.3

## 1.1.13

### Patch Changes

- [#1698](https://github.com/portabletext/editor/pull/1698) [`c4fd0cd`](https://github.com/portabletext/editor/commit/c4fd0cd273cb95e1d5769514c730cf9397dc279f) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.2

## 1.1.12

### Patch Changes

- [#1686](https://github.com/portabletext/editor/pull/1686) [`dfe17a1`](https://github.com/portabletext/editor/commit/dfe17a1a307b1a512818b37645a8efd05407a0a5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.10.1

## 1.1.11

### Patch Changes

- [#1672](https://github.com/portabletext/editor/pull/1672) [`b7997e1`](https://github.com/portabletext/editor/commit/b7997e1f37cc65a4cebc90967a81852690980262) Thanks [@christianhg](https://github.com/christianhg)! - fix: handle `ArrayDefinition` with image field

## 1.1.10

### Patch Changes

- [#1654](https://github.com/portabletext/editor/pull/1654) [`6071455`](https://github.com/portabletext/editor/commit/6071455249417866398439cc707d94d6baf97cbf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.9.0

## 1.1.9

### Patch Changes

- [#1638](https://github.com/portabletext/editor/pull/1638) [`d7f34d4`](https://github.com/portabletext/editor/commit/d7f34d4191d3248c69ef14125670db89517772d5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.8.1

## 1.1.8

### Patch Changes

- [#1622](https://github.com/portabletext/editor/pull/1622) [`6539bfc`](https://github.com/portabletext/editor/commit/6539bfc45ef0f31d38d475a2461725529b24f2f3) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.6.1

## 1.1.7

### Patch Changes

- [#1594](https://github.com/portabletext/editor/pull/1594) [`8ebc392`](https://github.com/portabletext/editor/commit/8ebc39284ac3c286c73046e99fef4e77193d4608) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update sanity monorepo to ^4.6.0

## 1.1.6

### Patch Changes

- Updated dependencies [[`7da6d79`](https://github.com/portabletext/editor/commit/7da6d790eab1566de522f65bf98410cc778fd303)]:
  - @portabletext/schema@1.2.0

## 1.1.5

### Patch Changes

- [#1582](https://github.com/portabletext/editor/pull/1582) [`b1acd3f`](https://github.com/portabletext/editor/commit/b1acd3f6e118195b3cbbc46c8dde619116ef4774) Thanks [@christianhg](https://github.com/christianhg)! - Mitigate `compileSchemaDefinitionToPortableTextMemberSchemaTypes` crashing for block object array fields

## 1.1.4

### Patch Changes

- Updated dependencies [[`1121f93`](https://github.com/portabletext/editor/commit/1121f9306b10481d10954f95211eed2ca20446f3)]:
  - @portabletext/schema@1.1.0

## 1.1.3

### Patch Changes

- [#1542](https://github.com/portabletext/editor/pull/1542) [`7f1d5a2`](https://github.com/portabletext/editor/commit/7f1d5a2e7576e51cba249721e9279d1b42f8bd99) Thanks [@stipsan](https://github.com/stipsan)! - Update LICENSE year from 2024 to 2025

- Updated dependencies [[`7f1d5a2`](https://github.com/portabletext/editor/commit/7f1d5a2e7576e51cba249721e9279d1b42f8bd99)]:
  - @portabletext/schema@1.0.1

## [1.1.2](https://github.com/portabletext/editor/compare/sanity-bridge-v1.1.1...sanity-bridge-v1.1.2) (2025-08-15)

### Bug Fixes

- reduce peer deps duplication and set min node 22 version ([#1532](https://github.com/portabletext/editor/issues/1532)) ([41aae56](https://github.com/portabletext/editor/commit/41aae568c208a3512683280319dbb018d13286da))

## [1.1.1](https://github.com/portabletext/editor/compare/sanity-bridge-v1.1.0...sanity-bridge-v1.1.1) (2025-08-14)

### Bug Fixes

- allow block objects and inline objects with the same name ([7c0beea](https://github.com/portabletext/editor/commit/7c0beeaa8fdc7167fc4c6b86bf9e668c20a5d6d4))
- **deps:** update sanity monorepo to ^4.4.0 ([6ba20dd](https://github.com/portabletext/editor/commit/6ba20dd704a244f4da157e1b543f89a6b4cb89db))
- **deps:** update sanity monorepo to ^4.4.1 ([697ec61](https://github.com/portabletext/editor/commit/697ec61fb74ad08ab0693377d483ab8765e2b8bd))
- make `sanitySchemaToPortableTextSchema` input more lax ([3162b5f](https://github.com/portabletext/editor/commit/3162b5f96e24cf6a0f17623365e4c07f557b1e25))

## [1.1.0](https://github.com/portabletext/editor/compare/sanity-bridge-v1.0.0...sanity-bridge-v1.1.0) (2025-08-13)

### Features

- add `sanitySchemaToPortableTextSchema` ([3f6e7be](https://github.com/portabletext/editor/commit/3f6e7be813e3c393db9637fd58da5bc02b40b277))

## 1.0.0 (2025-08-13)

### Features

- introduce `@portabletext/sanity-bridge` package ([a7c0ca7](https://github.com/portabletext/editor/commit/a7c0ca757c3d171a8b879e5c669bfc5264fd7fcd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @portabletext/schema bumped to 1.0.0

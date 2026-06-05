# @portabletext/markdown

## 1.4.0

### Minor Changes

- [#2699](https://github.com/portabletext/editor/pull/2699) [`7b961d4`](https://github.com/portabletext/editor/commit/7b961d40cda88ea3a65380ae6dd18562503f32a4) Thanks [@christianhg](https://github.com/christianhg)! - feat: support per-column alignment on tables

  The default `table` block-object now carries an optional `alignment` field that mirrors GFM's per-column alignment markers. `markdownToPortableText` reads the colons on the delimiter row (`:---`, `:---:`, `---:`) and writes them to `alignment` as an array of `'left' | 'center' | 'right' | null`, indexed by column. `portableTextToMarkdown` does the inverse: a `null` (or missing) entry emits `---`, otherwise the entry decides which colons surround the dashes. Tables without alignment round-trip unchanged - the `alignment` field is omitted on the way in and skipped on the way out.

### Patch Changes

- [#2744](https://github.com/portabletext/editor/pull/2744) [`010f182`](https://github.com/portabletext/editor/commit/010f1820c0af8a4f613394eefe3169c11e486a43) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update dependency markdown-it to ^14.2.0

- [#2732](https://github.com/portabletext/editor/pull/2732) [`409a970`](https://github.com/portabletext/editor/commit/409a97041a37bc0214f3475554b834a16d92866a) Thanks [@christianhg](https://github.com/christianhg)! - fix: stop transforming typography characters in markdown input

## 1.3.2

### Patch Changes

- [#2694](https://github.com/portabletext/editor/pull/2694) [`491d5ff`](https://github.com/portabletext/editor/commit/491d5ffedbbce814967289af44010fdd7ca017f7) Thanks [@christianhg](https://github.com/christianhg)! - fix: `DefaultTableRenderer` widens asymmetric tables to fit the widest row

  When rows had different cell counts the delimiter row was sized to the header, so a GFM parser silently dropped cells from any body row that was wider than the header. The renderer now sizes the delimiter to the widest row and pads narrower rows with empty cells so all data survives the round-trip.

- [#2697](https://github.com/portabletext/editor/pull/2697) [`8247ec5`](https://github.com/portabletext/editor/commit/8247ec551022d4ae077c40aff475f16533b9ac12) Thanks [@christianhg](https://github.com/christianhg)! - fix: `DefaultTableRenderer` escapes characters that would break a GFM table row

  A `|` in a cell's text used to end the cell, causing all cells to the right to shift. A `\n` inside a multi-line block-object (such as a code block) used to end the row, causing all cells after the first line break to be lost. The renderer now escapes literal pipes as `\|` and replaces newlines with `<br>` so every cell in the source Portable Text survives the round-trip through `markdownToPortableText`.

## 1.3.1

### Patch Changes

- [#2692](https://github.com/portabletext/editor/pull/2692) [`c440b2f`](https://github.com/portabletext/editor/commit/c440b2f09fa466d7c18971e71c1010c08edc7bb5) Thanks [@christianhg](https://github.com/christianhg)! - fix: `DefaultTableRenderer` always emits a valid GFM table

  The first row is always rendered as the header, followed by the delimiter row, followed by the remaining rows as body. The `headerRows` field on the Portable Text table is ignored on serialization so that the emitted Markdown round-trips through any GFM parser. Tables with no rows render as an empty string.

## 1.3.0

### Minor Changes

- [#2628](https://github.com/portabletext/editor/pull/2628) [`3209fbb`](https://github.com/portabletext/editor/commit/3209fbb65b169cc69a0b5496c4735fa52f414cdc) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `types.list` matcher to `markdownToPortableText` for list-as-container

  Lets consumers take ownership of structural list emission on the way in, mirroring the existing `types.table` pattern. When a `types.list` matcher is provided, list tokens become `{_type: 'list', kind, items: [...]}` block-objects whose `list-item.content` arrays can hold any block - text blocks, code blocks, callouts, images, even nested lists. The default flat path (text blocks with `listItem` and `level` fields) is unchanged for consumers who don't register the matcher.

  Pair with `defineContainer({type: 'list', childField: 'items'})` and `defineContainer({type: 'list-item', childField: 'content'})` in PTE v7 to get list items that hold rich content.

- [#2604](https://github.com/portabletext/editor/pull/2604) [`334a99d`](https://github.com/portabletext/editor/commit/334a99d0d9e97185f7eef88b3ea7e2ed0eaed23f) Thanks [@christianhg](https://github.com/christianhg)! - feat: support GFM task lists in markdown round-trip

  `markdownToPortableText` now recognizes GitHub-Flavored Markdown task list items (`- [ ] foo` and `- [x] foo`) and converts them into Portable Text blocks with `listItem: 'task'` and a boolean `checked` field. `portableTextToMarkdown` renders these blocks back to the same syntax. The default schema declares the `task` list type and a `checked` block field, so consumers using the default schema get round-tripping for free. Schemas without a `task` list type fall back to `bullet` and discard the checkbox prefix.

- [#2629](https://github.com/portabletext/editor/pull/2629) [`11822d0`](https://github.com/portabletext/editor/commit/11822d0339908d7f68b1469de181fcb5a1caad39) Thanks [@christianhg](https://github.com/christianhg)! - feat: add `types.blockquote` matcher to `markdownToPortableText` for structured blockquotes

  When a `types.blockquote` matcher is provided, plain blockquotes become structural block-objects (`{_type: 'blockquote', content: [...]}`) instead of flat text blocks with `style: 'blockquote'`. This unlocks placing code blocks, images, lists, and nested blockquotes inside a quote without losing attribution. GFM alerts (`> [!NOTE]`, `> [!TIP]`, etc.) keep producing callouts via the separate `types.callout` matcher; the two never compete on the same source.

  Without `types.blockquote`, the existing flat-block path runs unchanged. If the matcher returns `undefined` for a given blockquote, the parser falls back to the flat shape for that one.

  Adds `DefaultBlockquoteObjectRenderer` for the round-trip back to Markdown.

### Patch Changes

- [#2660](https://github.com/portabletext/editor/pull/2660) [`95609ac`](https://github.com/portabletext/editor/commit/95609ac8c40c9290ccf98983441da5a4c41c91ba) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update dependency @mdit/plugin-alert to ^0.23.2

- Updated dependencies [[`239e100`](https://github.com/portabletext/editor/commit/239e100b1760c0f20fdeefa659bd8c81c749d7a7), [`c6103e0`](https://github.com/portabletext/editor/commit/c6103e005a527c8e2717d9d8ad11da49cee9e942), [`fea850c`](https://github.com/portabletext/editor/commit/fea850c5feab41097dc65f92b56e48b765257559)]:
  - @portabletext/schema@2.2.0

## 1.2.0

### Minor Changes

- [#2417](https://github.com/portabletext/editor/pull/2417) [`251c51b`](https://github.com/portabletext/editor/commit/251c51b7a731dc5008798ea1f922e3d1ad2e11d5) Thanks [@christianhg](https://github.com/christianhg)! - feat: add first-class GFM callout support

  GFM callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.) are now parsed as structured callout objects instead of regular blockquotes. A `DefaultCalloutRenderer` is also available for serializing callout objects back to GFM syntax. Consumers can customize callout handling via the `types.callout` matcher option.

  ```ts
  import {markdownToPortableText} from '@portabletext/markdown'

  markdownToPortableText('> [!NOTE]\n> This is a note')
  // => [{_type: 'callout', tone: 'note', content: [...]}]
  ```

  ```ts
  import {
    DefaultCalloutRenderer,
    portableTextToMarkdown,
  } from '@portabletext/markdown'

  portableTextToMarkdown(blocks, {
    types: {callout: DefaultCalloutRenderer},
  })
  // => '> [!NOTE]\n> This is a note'
  ```

## 1.1.4

### Patch Changes

- [#2307](https://github.com/portabletext/editor/pull/2307) [`5031f18`](https://github.com/portabletext/editor/commit/5031f18f3d22f8acc5f4d39e6ea0db7b96d72553) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update dependency @portabletext/toolkit to ^5.0.2

## 1.1.3

### Patch Changes

- [#2193](https://github.com/portabletext/editor/pull/2193) [`c47fd7c`](https://github.com/portabletext/editor/commit/c47fd7c4478cdb5b2acfe2f681d7cb146a0996a5) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update dependency markdown-it to ^14.1.1

## 1.1.2

### Patch Changes

- [#2078](https://github.com/portabletext/editor/pull/2078) [`0a7a4cc`](https://github.com/portabletext/editor/commit/0a7a4cc5e4624f60abd919d39b9015c191cc10eb) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update dependency @portabletext/toolkit to ^5.0.1

## 1.1.1

### Patch Changes

- [#2043](https://github.com/portabletext/editor/pull/2043) [`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764) Thanks [@stipsan](https://github.com/stipsan)! - Implement `publishConfig.exports`

- Updated dependencies [[`6af9559`](https://github.com/portabletext/editor/commit/6af9559d273b85113d9eba92ca85d6322a581764)]:
  - @portabletext/schema@2.1.1

## 1.1.0

### Minor Changes

- [#2037](https://github.com/portabletext/editor/pull/2037) [`9292b9a`](https://github.com/portabletext/editor/commit/9292b9ad69d63e43f91600e16b2ed84012449e89) Thanks [@christianhg](https://github.com/christianhg)! - feat: enable typographic transformations

  When converting Markdown to Portable Text, typographic transformations are now applied:
  - Straight quotes (`"` and `'`) become curly quotes (`"`, `"`, `'`, `'`)
  - `---` becomes an em-dash (`—`)
  - `--` becomes an en-dash (`–`)
  - `...` becomes an ellipsis (`…`)

  **Before:**

  ```md
  He said "it's all in chapters 12--14"... That's right---all of it.
  ```

  Would produce text: `He said "it's all in chapters 12--14"... That's right---all of it.`

  **After:**

  Produces text: `He said "it's all in chapters 12–14"… That's right—all of it.`

## 1.0.8

### Patch Changes

- [#2035](https://github.com/portabletext/editor/pull/2035) [`ccedf45`](https://github.com/portabletext/editor/commit/ccedf450c0d8ca03b9eb7599ab137c79736ac9a4) Thanks [@christianhg](https://github.com/christianhg)! - fix: handle block elements inside list items

  Block elements (code blocks, images, HRs, blockquotes) in list items
  now correctly split output and preserve surrounding content. Also
  fixes code block fallback when not defined in schema.

## 1.0.7

### Patch Changes

- Updated dependencies [[`c2c566d`](https://github.com/portabletext/editor/commit/c2c566ddf3a47dcf3a089cce8375679942b920f8)]:
  - @portabletext/schema@2.1.0

## 1.0.6

### Patch Changes

- [#2014](https://github.com/portabletext/editor/pull/2014) [`d955467`](https://github.com/portabletext/editor/commit/d9554679d7c6d7d1eae172c8dc755c0b2fb7d542) Thanks [@christianhg](https://github.com/christianhg)! - fix: escape and unescape special characters links and images

  Previously, when converting Portable Text to Markdown, link texts and image alt texts containing `[`, `]`, or `\` would produce malformed Markdown:

  **Input**:

  ```json
  [
    {
      "_type": "block",
      "children": [
        {
          "_type": "span",
          "text": "f[oo",
          "marks": ["l0"]
        }
      ],
      "markDefs": [
        {
          "_key": "l0",
          "_type": "link",
          "href": "https://example.com"
        }
      ]
    }
  ]
  ```

  **Before**:

  ```md
  [f[oo](https://example.com)
  ```

  **After**:

  ```md
  [f\[oo](https://example.com)
  ```

  Similarly, escaped Markdown in link texts and image alt texts wasn't unescaped when converting Markdown to Portable Text.

  **Input**:

  ```md
  [f\[oo](https://example.com)
  ```

  **Before**:

  ```json
  [
    {
      "_type": "block",
      "children": [
        {
          "_type": "span",
          "text": "f\[oo",
          "marks": ["l0"]
        }
      ],
      "markDefs": [
        {
          "_key": "l0",
          "_type": "link",
          "href": "https://example.com"
        }
      ]
    }
  ]
  ```

  **After**:

  ```json
  [
    {
      "_type": "block",
      "children": [
        {
          "_type": "span",
          "text": "f[oo",
          "marks": ["l0"]
        }
      ],
      "markDefs": [
        {
          "_key": "l0",
          "_type": "link",
          "href": "https://example.com"
        }
      ]
    }
  ]
  ```

  Additionally, link and image titles containing `"` or `\` are now properly escaped:

  **Input**:

  ```json
  [
    {
      "_type": "block",
      "children": [
        {
          "_type": "span",
          "text": "foo",
          "marks": ["l0"]
        }
      ],
      "markDefs": [
        {
          "_key": "l0",
          "_type": "link",
          "href": "https://example.com",
          "title": "link \"title\""
        }
      ]
    }
  ]
  ```

  **Before**:

  ```md
  [foo](https://example.com "link "title"")
  ```

  **After**:

  ```md
  [foo](https://example.com 'link "title"')
  ```

## 1.0.5

### Patch Changes

- [#1993](https://github.com/portabletext/editor/pull/1993) [`cf0572b`](https://github.com/portabletext/editor/commit/cf0572b93b5179b74239418a6df671530a4cf865) Thanks [@stipsan](https://github.com/stipsan)! - upgrade `@portabletext/*` to latest major

## 1.0.4

### Patch Changes

- [#1984](https://github.com/portabletext/editor/pull/1984) [`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da) Thanks [@stipsan](https://github.com/stipsan)! - Stop publishing src folder to npm

- Updated dependencies [[`56168e5`](https://github.com/portabletext/editor/commit/56168e5a84f38bbb1ab9f2d85c8d5745b15e22da)]:
  - @portabletext/schema@2.0.1

## 1.0.3

### Patch Changes

- [#1941](https://github.com/portabletext/editor/pull/1941) [`0319437`](https://github.com/portabletext/editor/commit/03194370904e6a3c47d0b97f4666c21c7e7df9e0) Thanks [@christianhg](https://github.com/christianhg)! - fix: trigger release to get updated docs on npm

## 1.0.2

### Patch Changes

- [#1938](https://github.com/portabletext/editor/pull/1938) [`8a47fd5`](https://github.com/portabletext/editor/commit/8a47fd59830920c1b1b1703b94d91484d7c186db) Thanks [@christianhg](https://github.com/christianhg)! - fix: trigger release

## 1.0.1

### Patch Changes

- [#1934](https://github.com/portabletext/editor/pull/1934) [`85fae3c`](https://github.com/portabletext/editor/commit/85fae3c7ca79ff27cd5aaf09cf64fed90bfd8862) Thanks [@christianhg](https://github.com/christianhg)! - fix: remove unused `@sanity/schema` dev dependency

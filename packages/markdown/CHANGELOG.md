# @portabletext/markdown

## 1.1.4

### Patch Changes

- Updated dependencies [[`4d6be62`](https://github.com/portabletext/editor/commit/4d6be62f1c1299a8e6e094b34a113f587c998556)]:
  - @portabletext/schema@2.2.0

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

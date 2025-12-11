# @portabletext/markdown

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

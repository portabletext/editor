# @portabletext/html

## 1.1.0

### Minor Changes

- [#2790](https://github.com/portabletext/editor/pull/2790) [`e8beb17`](https://github.com/portabletext/editor/commit/e8beb1732b3e1483d787ddddd419e145d7cae51d) Thanks [@christianhg](https://github.com/christianhg)! - feat: map Google Docs monospace text to code blocks and `code` decorators

  Pasting code from Google Docs now preserves it. Google Docs has no semantic markup for code; the only signal is a monospace `font-family` on spans (e.g. `font-family:'Roboto Mono',monospace`), which was previously ignored, so code paragraphs deserialized as plain text.

  A run of consecutive paragraphs whose text is entirely monospace now becomes a single `code` block object (lines joined with newlines) when the schema defines a `code` block object with a `code` string field. Blank lines inside the run stay inside the code block, and indentation is preserved (whitespace inside spans that combine a monospace font with `white-space:pre-wrap` is treated as content). Monospace spans inside mixed paragraphs get the `code` decorator when the schema defines one. Schemas that can hold neither produce the same plain text as before.

  Note that the detection is a heuristic: a document deliberately styled entirely in a monospace font will deserialize as one code block.

- [#2790](https://github.com/portabletext/editor/pull/2790) [`01194f7`](https://github.com/portabletext/editor/commit/01194f78252045e13a3187e0fb5d1639a93bd4e8) Thanks [@christianhg](https://github.com/christianhg)! - feat: deserialize `<pre>` into a code block object

  `<pre>` elements now deserialize into a dedicated code block object via the new `types.code` matcher, sharing the convention used by `@portabletext/markdown`. The default matcher resolves against the schema's `code` block object when it declares a `code` string field (the shape of the default schema's code object, and of `@sanity/code-input`), emitting `{_type: 'code', code: text}`. Schemas without such an object keep getting a text block, now with the `code` decorator applied when the schema defines one (previously the decorator check looked for a `code` _style_, so the decorator was never applied for typical schemas).

  Consumers with a different shape can pass their own matcher:

  ```ts
  htmlToPortableText(html, {
    types: {
      code: ({context, value}) => ({
        _key: context.keyGenerator(),
        _type: 'codeSnippet',
        source: value.code,
      }),
    },
  })
  ```

  The matcher receives `{language: string | undefined, code: string}` and returns the Portable Text Object to emit, or `undefined` to fall through (e.g. to a `code`-decorated text block).

### Patch Changes

- [#2847](https://github.com/portabletext/editor/pull/2847) [`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update vitest to ^4.1.9

- [#2790](https://github.com/portabletext/editor/pull/2790) [`e64adc8`](https://github.com/portabletext/editor/commit/e64adc84ec77e73ef39a3c20c0aea46200fe2a02) Thanks [@christianhg](https://github.com/christianhg)! - fix: swallow Google Docs' `Apple-interchange-newline` `<br>`

  Pasting from Google Docs no longer produces a trailing empty paragraph. The clipboard HTML ends with `<br class="Apple-interchange-newline">`, which previously fell through to the generic `br` handling and deserialized as an extra block containing only a newline.

- Updated dependencies [[`76af976`](https://github.com/portabletext/editor/commit/76af9766fd17334a40b24140e08d114967a31645)]:
  - @portabletext/schema@2.2.2

## 1.0.3

### Patch Changes

- Updated dependencies [[`95e2b8d`](https://github.com/portabletext/editor/commit/95e2b8d51525adf5ff16a2930aee569a6f05da8a)]:
  - @portabletext/schema@2.2.1

## 1.0.2

### Patch Changes

- Updated dependencies [[`239e100`](https://github.com/portabletext/editor/commit/239e100b1760c0f20fdeefa659bd8c81c749d7a7), [`c6103e0`](https://github.com/portabletext/editor/commit/c6103e005a527c8e2717d9d8ad11da49cee9e942), [`fea850c`](https://github.com/portabletext/editor/commit/fea850c5feab41097dc65f92b56e48b765257559)]:
  - @portabletext/schema@2.2.0

## 1.0.1

### Patch Changes

- [#2397](https://github.com/portabletext/editor/pull/2397) [`99c5a4f`](https://github.com/portabletext/editor/commit/99c5a4f6f9515af6341b8947ec08d487735b72dc) Thanks [@stipsan](https://github.com/stipsan)! - Upgrade `@vercel/stega` to v1.1.0

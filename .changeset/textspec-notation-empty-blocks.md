---
'@portabletext/test': major
---

fix(test)!: use @textspec/notation 2.0.0

`toTextspec` writes an empty text block as `B:` instead of `B: `, with or without attributes, for example `B style="h1":`, and at any depth inside containers. Expected strings that end a block with `B: ` (followed by the end of the string, a line break, `;;` or `}`) need the space removed. An empty block that holds the caret is still `B: |`.

In multiline output, when a text block's line ends in a space, that last space is written as `\s`: `B: foo \nB: bar` becomes `B: foo\s\nB: bar`. Single-line output (`{singleLine: true}`) keeps a final content space as a plain space.

`fromTextspec` and `selectionFromTextspec` accept both `B:` and `B: ` for an empty text block. A block type followed by `:` with no indented children, such as `CALLOUT:`, is now read as an empty text block instead of failing with "Container has no children".

---
'@portabletext/block-tools': patch
---

fix: detect Word list types from `@list` CSS definitions

Word paste was flipping bullet and numbered list types. The `lfo` reference
number in `mso-list` style attributes is an arbitrary ID assigned per document,
not a list type indicator. The fix parses the `@list` CSS definitions from the
`<style>` block to check for `mso-level-number-format:bullet`, which is the
actual signal for bullet lists.

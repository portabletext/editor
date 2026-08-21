---
'@portabletext/plugin-markdown-shortcuts': patch
---


fix: warn once when reading the deprecated `schema`/`level` callback arguments

`defaultStyle`, `blockquoteStyle`, `headingStyle`, `orderedList`, and `unorderedList` callbacks still receive the deprecated top-level `schema` argument (and `headingStyle` still receives the deprecated top-level `level`), but reading either now logs a one-time console warning naming `context.schema` or `props.level` as the replacement. Callbacks that only read `context.schema` and `props.level` see no warning. Both deprecated arguments are removed in the next major.

Any read of the deprecated fields counts, including spreading the callback argument. The warning fires once per process; the deprecated fields are removed in the next major.

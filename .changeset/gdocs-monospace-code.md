---
"@portabletext/html": minor
---

feat: map Google Docs monospace text to code blocks and `code` decorators

Pasting code from Google Docs now preserves it. Google Docs has no semantic markup for code; the only signal is a monospace `font-family` on spans (e.g. `font-family:'Roboto Mono',monospace`), which was previously ignored, so code paragraphs deserialized as plain text.

A run of consecutive paragraphs whose text is entirely monospace now becomes a single `code` block object (lines joined with newlines) when the schema defines a `code` block object with a `code` string field. Blank lines inside the run stay inside the code block, and indentation is preserved (whitespace inside spans that combine a monospace font with `white-space:pre-wrap` is treated as content). Monospace spans inside mixed paragraphs get the `code` decorator when the schema defines one. Schemas that can hold neither produce the same plain text as before.

Note that the detection is a heuristic: a document deliberately styled entirely in a monospace font will deserialize as one code block.

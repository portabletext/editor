---
'@portabletext/block-tools': patch
---

fix: improve whitespace handling

Trimming whitespace is now more reliable because it happens in a post processing step after the ordinary deserialization and block flattening has been conducted. This fixes issues with lonely images in Google Docs paragraphs being removed and improves trimming whitespace after tables.


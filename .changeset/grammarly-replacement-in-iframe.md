---
"@portabletext/editor": patch
---

fix: apply `insertReplacementText` at the correct position inside iframes

Accepting a suggestion from a browser extension like Grammarly now replaces the targeted word, even when the editor is mounted inside an iframe.

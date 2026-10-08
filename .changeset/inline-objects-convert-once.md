---
'@portabletext/sanity-bridge': patch
---

fix: convert each inline object and annotation once

A rich-text field nested inside an inline object no longer re-expands every inline object below it. Studio no longer freezes or runs out of memory on schemas where several inline object types embed the same rich-text field.

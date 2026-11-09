---
'@portabletext/markdown': patch
---

fix: describe which objects `undeclaredObjects` checks

The `undeclaredObjects` documentation on `ReconciliationReport` said that undeclared objects inside a table cell or another declared container are listed. They are not. Only top-level block objects and the inline objects of top-level text blocks are checked, and the fields of a declared object are left to whatever validates that object, as the README already says.

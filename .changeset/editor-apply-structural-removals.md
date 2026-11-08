---
'@portabletext/editor': patch
---

fix: apply removals from structural corrections

The editor removes array entries that are not objects, including strings, numbers, booleans and `null`, anywhere in the document when they arrive by remote patch. Non-object entries inside container, table and nested container arrays are also removed when they arrive through `initialValue` or `update value`.

The traversal functions now treat an array entry that is not an object as if it were not there. `getNode` and `hasNode` return `undefined` and `false` for a path to or through one. `getChildren`, `getNodes` and `getSibling` skip it, and `getAncestors`, `getAncestor` and `getParent` return their missing result through it. None of them throw on such an entry.

A root `null` supplied through `initialValue` or `update value` is not removed by this fix.

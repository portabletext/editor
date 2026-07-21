---
'@portabletext/editor': patch
---

fix: require covered text for `isActiveAnnotation`'s `'partial'` mode on expanded selections

`isActiveAnnotation(name, {mode: 'partial'})` reported the annotation active when an expanded selection merely touched it at a zero-width boundary, selecting none of its text. It now answers true only when the selection covers at least one character of an annotated span, matching the documented "partially selected" contract.

For collapsed selections the two modes now share the editor's canonical caret answer: active with the caret inside an annotated span, not active at its edges, matching typing semantics (annotations don't expand at their edges). Previously `'partial'` also counted a caret sitting exactly on an annotation's boundary.

Behaviors built on the selector inherit the correction: adding an annotation with a selection that only borders an existing one no longer triggers the overlap-prevention removal cycle for that annotation.

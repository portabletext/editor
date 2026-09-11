---
'@portabletext/markdown': patch
---

fix: mint sibling-unique keys even from a colliding `keyGenerator`

`markdownToPortableText` (and everything built on it) now guards the supplied `keyGenerator`: a generator that returns an already-minted key is retried, then deterministically suffixed, so one conversion can never mint the same `_key` twice. A repeated key did not just duplicate identity, it made annotation ownership ambiguous: two mark definitions sharing a key leave every referencing span attributable to either, which no later repair can resolve. Well-behaved generators are unaffected.

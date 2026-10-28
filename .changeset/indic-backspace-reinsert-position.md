---
'@portabletext/editor': patch
---

fix: reinsert the rest of a backspaced Indic cluster where it was removed

Backspacing at the start of a span that follows an Indic conjunct cluster in the previous span no longer moves the rest of the cluster into the caret's span. With bold "fक्त" followed by plain "b" and the caret before "b", Backspace now leaves bold "fक्" and plain "b". Previously the editor produced bold "f" and plain "क्b", so the remaining characters lost their formatting.

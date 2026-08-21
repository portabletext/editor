---
'@portabletext/editor': patch
---

fix: treat Indic conjunct clusters as a single grapheme

Caret movement and character positions over Indic conjunct clusters (for example Devanagari क्ष, a consonant + virama + consonant sequence) now step over the whole cluster instead of landing inside it, matching how browsers render these sequences. Grapheme boundaries follow Unicode [UAX #29](https://unicode.org/reports/tr29/) rule GB9c, covering Devanagari, Bengali, Gujarati, Oriya, Telugu, Malayalam, and the other scripts with conjunct linkers.

Forward delete (the Delete key) at the start of a conjunct cluster now removes the whole cluster instead of only the leading consonant and virama. Backspace is unchanged: it still removes one code unit at a time, matching how native inputs handle these scripts. The exception is the few supplementary-plane scripts with conjunct linkers (Kharoshthi, Chakma, Tulu-Tigalari, Dives Akuru, Zanabazar Square, Soyombo, Kawi), where backspace removes the whole cluster.

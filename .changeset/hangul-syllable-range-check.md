---
'@portabletext/editor': patch
---

fix: classify Hangul syllables with a range check instead of lookup regexes

The editor's grapheme segmentation now tells Hangul LV and LVT syllables apart with the Unicode composition formula instead of two lookup tables listing all 11,172 syllables. Cursor movement and deletion over Korean text behave exactly as before, and the main `@portabletext/editor` entry ships 3,468 fewer bytes of gzipped JavaScript.

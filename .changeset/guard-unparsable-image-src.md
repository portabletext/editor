---
'@portabletext/markdown': patch
---

fix: serialize images the parser would refuse as `json:object` fences

An `image` whose `src` a Markdown parser would refuse (a `data:` URI outside `png`/`gif`/`jpeg`/`webp`, or a `javascript:`/`vbscript:`/`file:` URI) previously serialized as `![alt](src)` anyway; reparsing that markdown turned the image into literal text instead of an image object, destroying it. Such an image now serializes as a `json:object` fence (or, inline, a tagged code span), which reparses back to the identical image value. Images with an accepted `src` are unaffected.

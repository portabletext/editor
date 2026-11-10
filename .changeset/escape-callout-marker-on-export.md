---
'@portabletext/markdown': patch
---

fix: escape a callout marker that starts a block on Markdown export

A block whose first line is only a GFM alert marker (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]`, in any case) now exports with the `[` escaped. A quote that starts with the marker reads back as a quote with its text instead of a callout. A plain paragraph that is only the marker also gets the backslash and reads back the same.

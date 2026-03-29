---
'@portabletext/markdown': minor
---

feat: add first-class GFM callout support to `markdownToPortableText`

GFM callouts (`> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, etc.) are now parsed as structured callout objects instead of regular blockquotes. Consumers can customize callout handling via the `types.callout` matcher option.

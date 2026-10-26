---
'@portabletext/markdown': patch
---

fix: remove the link, not the surrounding bold, when a link closes in `markdownToPortableText`

Text that follows a link inside a bold run now stays bold, and the link ends where the Markdown link ends:

```ts
markdownToPortableText('**[x](https://example.com) y** z')
// Now:        "x" [strong, link], " y" [strong], " z" []
// Previously: "x" [strong, link], " y z" [link]
```

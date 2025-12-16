---
'@portabletext/markdown': minor
---

feat: enable typographic transformations

When converting Markdown to Portable Text, typographic transformations are now applied:

- Straight quotes (`"` and `'`) become curly quotes (`"`, `"`, `'`, `'`)
- `---` becomes an em-dash (`—`)
- `--` becomes an en-dash (`–`)
- `...` becomes an ellipsis (`…`)

**Before:**

```md
He said "it's all in chapters 12--14"... That's right---all of it.
```

Would produce text: `He said "it's all in chapters 12--14"... That's right---all of it.`

**After:**

Produces text: `He said "it's all in chapters 12–14"… That's right—all of it.`

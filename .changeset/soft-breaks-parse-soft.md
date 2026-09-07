---
'@portabletext/markdown': patch
---

fix: parse markdown soft breaks as spaces, not line breaks

Markdown written across several source lines, the way editors and prose tools wrap text, is one paragraph that reflows. `markdownToPortableText` used to bake each of those wraps into the text as a literal newline, exactly as if you had written a hard break, and converting back to markdown then produced real hard breaks that weren't in your document.

Wrapped source like this:

```md
This paragraph is written
across two source lines.
```

used to parse to the span text `'This paragraph is written\nacross two source lines.'` (a fixed line break in the content) and now parses to `'This paragraph is written across two source lines.'` (one reflowing line, which is how markdown renders it).

Real hard breaks are unchanged: end a line with two or more spaces, or a backslash, and the span text still gets a `\n`:

```md
Line one\
Line two
```

still parses to `'Line one\nLine two'`.

---
'@portabletext/markdown': patch
---

fix: escape markdown syntax in plain span text during serialization

Literal markdown punctuation in span text now survives the round trip: serialization escapes it, so it parses back as the same literal text instead of turning into markup.

```ts
// span text        markdown (before)   markdown (now)      re-parses as
'*bar*'          // *bar*               \*bar\*             the text `*bar*` (was: an `em` span reading `bar`)
'# heading'      // # heading           \# heading          the text `# heading` (was: an `h1`)
'[x]: y'         // [x]: y              \[x]: y             the text `[x]: y` (was: nothing, consumed as a link reference)
```

Escaping accounts for the block context a span renders into (a heading, a blockquote, a list item, a table cell) and for hazards that only appear once adjacent spans or marks are joined, such as a link pattern or an ordered-list marker split across spans. Text with the `code` decorator is never backslash-escaped; instead its backtick delimiters widen past any backtick run in the content (with space padding when the content starts or ends with a backtick), so the content survives verbatim:

```ts
// span text with the `code` decorator   markdown (before)   markdown (now)
'a`b'                                 // `a`b`  (broken)     ``a`b``
'`a'                                  // ``a`   (broken)     `` `a ``
```

Markdown output for text containing such punctuation gains backslash escapes it didn't have before.

Consumer mark and block renderers now receive pre-escaped `children`. A renderer that needs the original, unescaped text (the `code` decorator's own default renderer does this) reads it from the `text` argument instead.

Two exceptions. An explicit-scheme URL or an email in plain text is never escaped: it keeps its text and gains a `link` mark on the next parse, since linkifying it is expected parser behavior, not something to suppress. Fuzzy forms (`www.`, bare domains) only stay unescaped while they contain no markdown-significant punctuation; with it, they take normal escaping, because the parser's emphasis pass beats fuzzy linkification and would otherwise consume the characters. Adjacent inline constructs can still claim marks of their own (an entity reference, a backtick, or a mark boundary sitting inside what would otherwise be that URL or email means the parser wouldn't have linkified it either, so normal escaping applies there instead). Leading or trailing whitespace that CommonMark's own block parsing trims is unaffected by this change, same as before it.

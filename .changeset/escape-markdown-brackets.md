---
'@portabletext/markdown': patch
---

fix: escape and unescape special characters links and images

Previously, when converting Portable Text to Markdown, link texts and image alt texts containing `[`, `]`, or `\` would produce malformed Markdown:

**Input**:

```json
[
  {
    "_type": "block",
    "children": [
      {
        "_type": "span",
        "text": "f[oo",
        "marks": ["l0"]
      }
    ],
    "markDefs": [
      {
        "_key": "l0",
        "_type": "link",
        "href": "https://example.com"
      }
    ]
  }
]
```

**Before**:

```md
[f[oo](https://example.com)
```

**After**:

```md
[f\[oo](https://example.com)
```

Similarly, escaped Markdown in link texts and image alt texts wasn't unescaped when converting Markdown to Portable Text.

**Input**:

```md
[f\[oo](https://example.com)
```

**Before**:

```json
[
  {
    "_type": "block",
    "children": [
      {
        "_type": "span",
        "text": "f\[oo",
        "marks": ["l0"]
      }
    ],
    "markDefs": [
      {
        "_key": "l0",
        "_type": "link",
        "href": "https://example.com"
      }
    ]
  }
]
```

**After**:

```json
[
  {
    "_type": "block",
    "children": [
      {
        "_type": "span",
        "text": "f[oo",
        "marks": ["l0"]
      }
    ],
    "markDefs": [
      {
        "_key": "l0",
        "_type": "link",
        "href": "https://example.com"
      }
    ]
  }
]
```

Additionally, link and image titles containing `"` or `\` are now properly escaped:

**Input**:

```json
[
  {
    "_type": "block",
    "children": [
      {
        "_type": "span",
        "text": "foo",
        "marks": ["l0"]
      }
    ],
    "markDefs": [
      {
        "_key": "l0",
        "_type": "link",
        "href": "https://example.com",
        "title": "link \"title\""
      }
    ]
  }
]
```

**Before**:

```md
[foo](https://example.com "link "title"")
```

**After**:

```md
[foo](https://example.com "link \"title\"")
```

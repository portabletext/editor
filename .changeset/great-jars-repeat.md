---
"@portabletext/markdown": patch
---

Fix lists that start deeper than level 1, or skip levels, serializing to broken Markdown

`portableTextToMarkdown` indented each list item by its absolute `level`, at three spaces per level. Markdown cannot express depth that way: indentation is relative to the list item above, and a first item indented four spaces or more is a code block, not a list.

A list item at level 3 with nothing above it produced six spaces of indent, so reading it back gave a code block instead of a list item, losing the item. A jump from level 1 to level 4 produced nine spaces, which was absorbed into the previous item as literal text rather than becoming a nested item.

Each jump to a deeper level is now a single step of nesting, however many levels it spans, so the output is valid Markdown that reads back as the same list structure. List numbering follows the list an item is actually rendered into, rather than its `level`.

Given a `number` item at level 3 followed by one at level 1, then a `bullet` at level 1, one at level 4, and one back at level 1:

```md
1. Starts at level 3
2. Back to level 1
- Bullet level 1
   - Jumps to level 4
- Bullet level 1 again
```

Previously the first line was indented into a code block and `Jumps to level 4` was swallowed into the line above it.

Lists that start at level 1 and change one level at a time are unaffected.

Custom list item renderers receive a new `listDepth` option carrying the depth to indent by. `value.level` is unchanged.

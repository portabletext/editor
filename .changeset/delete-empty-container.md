---
"@portabletext/editor": patch
---

fix: delete an empty editable container when the user hits Backspace or Delete inside it

When the caret sits inside an editable container whose only content
is a single empty text block, pressing Backspace or Delete removes
the whole container. The removal walks up through any enclosing
container that would be left vacuous, stopping at the first ancestor
with structural siblings (for example, a table cell inside a row).
After the removal, the caret lands on the adjacent block, or on a
freshly normalized text block if the container was the editor's only
content.

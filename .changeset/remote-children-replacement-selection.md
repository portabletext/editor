---
'@portabletext/editor': patch
---

fix: preserve selections through remote children replacements that keep the text

When a remote change replaces a block's children with re-keyed spans
(a collaborator toggling a mark that splits spans), the local cursor
and any other tracked selection no longer jump to the start of the
block. As long as the block's text is unchanged, selections keep
their exact textual position; replacements that change the text keep
the previous behavior.

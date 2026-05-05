---
"@portabletext/editor": patch
---

fix: use `targetRange` from `beforeinput` to place text replacements

When an extension or IME uses `insertReplacementText` (Grammarly, browser autocorrect, macOS substitution panel, etc.), the replacement now lands at the range the browser indicates via `getTargetRanges()` instead of at the editor selection, and the caret lands right after the inserted text instead of jumping back to where the user was typing.

The previous behavior bailed out when the node-map dirty flag was set from a recent edit, falling back to `editor.selection`. Reported as: typing a character and then accepting a suggestion placed the replacement at the post-typing caret instead of at the underlined word. For cross-block replacements, the caret also stayed in the original block instead of following the replacement, because the handler stashed the pre-replacement selection in `userSelection` and then restored it after the replacement was applied.

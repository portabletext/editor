---
"@portabletext/editor": patch
---

fix: render the zero-width character in void spacers on Android so DOM selection can anchor to them

Tapping a block-object or inline-object on Android could land the caret somewhere other than where the user tapped. The void spacer next to each object node was rendered as an empty text node, leaving nothing for DOM selection to anchor to, so the browser retargeted the selection past the spacer. The spacer now renders the same zero-width character used elsewhere in the editor, giving the browser a stable anchor and matching iOS and desktop behavior.

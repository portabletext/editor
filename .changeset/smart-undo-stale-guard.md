---
'@portabletext/plugin-input-rule': patch
---

fix: only smart-undo on Backspace when no edit landed since the input rule applied

Pressing Backspace right after an input rule fires still undoes the rule, including when a collaborator's changes arrive in between. Once any other local edit lands, Backspace acts normally again.

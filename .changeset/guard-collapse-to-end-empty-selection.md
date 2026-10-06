---
'@portabletext/editor': patch
---

fix: skip `collapseToEnd` during composition when the DOM selection has no ranges

The editor no longer crashes when the browser selection is cleared in the middle of an IME composition, for example when focus briefly moves away or a browser extension clears the selection while a Japanese, Chinese, or Korean input method is composing. The editor's next render previously threw `InvalidStateError: Failed to execute 'collapseToEnd' on 'Selection': there is no selection.` and unmounted the editor. It now skips moving the DOM selection when there is none to move.

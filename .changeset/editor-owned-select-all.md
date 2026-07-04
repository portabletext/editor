---
'@portabletext/editor': patch
---

fix: implement editor-owned select-all

Cmd+A/Ctrl+A previously relied on the browser's native select-all, which
chromium silently collapses whenever a non-editable element sits at either
content edge of the editor. Any document starting or ending with a block
object, and any table-shaped container render with selection chrome, made
select-all a no-op. The editor now handles the shortcut itself and selects
the full document range, deterministically across browsers and custom
renders. The behavior is registered alongside the other default keyboard
shortcuts and can be overridden like any other.

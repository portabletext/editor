---
'@portabletext/editor': patch
---

fix: prevent duplicate `'select'` events

### What changed

**Behavior events** (intercepted via `defineBehavior({on: 'select', ...})`) are now only emitted for **actionable** selection changes - ones you can actually intercept and modify.

**Emitted events** (subscribed via `EventListenerPlugin` or `editor.on('selection', ...)`) continue to fire for all selection changes.

### Why

Previously, a single arrow key press could emit two `'select'` behavior events:
1. The behavior handling the key raises `'select'`
2. The browser's DOM selection change triggers another `'select'`

This made it difficult to reliably intercept selection changes.

### What this means for you

- **`'select'` behavior events** now only fire for:
  - Initial editor focus (click, tab into editor)
  - Arrow key navigation
  - Programmatic selection via `editor.send({type: 'select', ...})`
  - Behaviors that raise `'select'`

- **`'select'` behavior events** no longer fire for:
  - Cursor movement after typing (implicit, already happened)
  - Cursor movement after delete/backspace (implicit, already happened)

- **To track ALL selection changes** (including implicit ones), use:
  ```tsx
  <EventListenerPlugin on={(event) => {
    if (event.type === 'selection') {
      console.log('Selection changed:', event.selection)
    }
  }} />
  ```
  Or: `editor.on('selection', (event) => { ... })`

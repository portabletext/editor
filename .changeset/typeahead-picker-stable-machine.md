---
'@portabletext/plugin-typeahead-picker': patch
---

fix: stabilize state machine instance in `useTypeaheadPicker`

`useTypeaheadPicker` built a fresh state machine on every render. Consumers running without React Compiler memoization would hit "Too many re-renders" the moment the picker became active, because each render created a new actor that emitted state updates that triggered the next render.

The picker's state machine is now declared at module scope (the shape xstate-react's docs assume), so the actor logic stays stable across renders.

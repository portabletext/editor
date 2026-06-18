---
"@portabletext/editor": patch
---

fix: keep `EngineString`/`TextString` uncompiled so the DOM-reconcile effect runs every render

In builds that compile the editor with React Compiler, a browser edit that
diverged from the model could leave a stray character in the rendered text
while the document itself stayed correct (for example, typing immediately
after toggling a decorator at a collapsed cursor). The rendered text now
always matches the document again.

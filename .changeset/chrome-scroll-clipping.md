---
'@portabletext/plugin-table': patch
---

fix: hide the portaled chrome when its anchor scrolls out of view

The trash chip and the table menu tracked the table on scroll but never clipped against it, so scrolling the table out of the editor's scrollport left them floating over unrelated UI. The chrome now anchors through `@floating-ui/dom`: the trash chip hides when its handle is clipped, the built-in menu closes when its trigger scrolls out, and a menu rendered through `renderMenu` closes the same way (its anchor unmounts it).

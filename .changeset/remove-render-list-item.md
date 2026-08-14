---
'@portabletext/editor': major
---

feat!: remove `renderListItem` and the core list-index machinery

The `renderListItem` render prop on `<PortableTextEditable>` is removed, along with the `RenderListItemFunction` type and the `data-list-index` attribute on legacy-rendered text blocks (`data-list-item` and `data-level` stay). Core no longer computes list-item indices at all.

List rendering migrates to a `defineTextBlock` registration (see the migrate-render-props guide), and list numbering comes from `@portabletext/plugin-list-index`: wrap the editor in `ListIndexProvider` and read `useListIndex(path)` inside the registered render to re-emit `data-list-index` (or use the index directly).

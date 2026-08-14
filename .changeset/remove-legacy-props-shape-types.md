---
'@portabletext/editor': major
---

feat!: remove the `BlockStyleRenderProps` and `BlockListItemRenderProps` types

The props shapes of the removed `renderStyle` and `renderListItem` render props are no longer exported. Code that borrowed fields from them (for example via `Pick`) declares the fields it needs itself; the useful members were `block` (`PortableTextTextBlock`), `children`, `focused`, and `selected`.

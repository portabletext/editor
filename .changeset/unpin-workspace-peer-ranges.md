---
'@portabletext/toolbar': patch
'@portabletext/plugin-input-rule': patch
'@portabletext/plugin-emoji-picker': patch
'@portabletext/plugin-typeahead-picker': patch
'@portabletext/plugin-typography': patch
---

fix(deps): replace pinned `workspace:^8.0.2` peer ranges with `workspace:^`

These five packages again require the `@portabletext/editor` version released alongside them. Their published peer range had been frozen at `^8.0.2`: the release tooling used to rewrite the pinned range on every release and stopped doing so in late August, leaving the pin as a fossil. With the bare `workspace:^` range, pnpm substitutes the co-released editor version at publish time, matching the other packages in the monorepo.

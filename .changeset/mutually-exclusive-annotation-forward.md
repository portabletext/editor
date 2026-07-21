---
'@portabletext/toolbar': patch
---

fix: let Core Behaviors expand collapsed selections before `useMutuallyExclusiveAnnotation` intercepts

Adding an annotation whose toolbar schema type configures `mutuallyExclusive` silently did nothing when the selection was collapsed: the hook's behavior `execute`d the event before the Core Behavior that expands a collapsed selection to the caret word could run, so the operation annotated zero characters and the definition was pruned. An empty `mutuallyExclusive` array (deliberate config meaning "exclusive with nothing, same-type overlap allowed") hit the same path on every add.

The behavior now declines collapsed selections: the Core Behavior expands them to the caret word and re-raises the add, which the hook then intercepts with the expanded selection. The configured exclusives are removed unconditionally (a no-op when inactive), and the event still `execute`s, preserving the design that the configured list fully replaces the default same-type exclusivity, an empty list keeps allowing same-type overlap.

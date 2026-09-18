---
'@portabletext/editor': patch
---

fix: emit structural repair patches immediately and make engine normalization the sole repairer

The editor repairs structural defects in any value passed to it, initial or updated: it generates a `_key` for a block or child that has none or duplicates a sibling's, and it inserts an empty span into a text block with no children. Until now those repairs stayed in the editor's memory and the fixing patches were only emitted once the user made their first edit. Now they are emitted as soon as the value is applied. The practical consequence: loading a broken document can produce a `mutation` to persist before any user action.

- An editable editor that receives a broken value emits the fixing `patch` events and their `mutation` right away. A host persisting mutations stores the repaired document immediately instead of at the user's first edit.
- A read-only editor that receives a broken value emits the `patch` events right away too, but holds the `mutation` until the editor becomes editable, because hosts reject writes to read-only documents.
- If a newer value arrives while a repair `mutation` is still pending, the outdated repair is discarded, whether the editor is read-only and holding it or editable and simply hasn't flushed it yet: a repair is never mistaken for unsaved edit work, so a host that already fixed the same defect with its own key supersedes ours regardless of which arrives first. When the newer value is broken too, a fresh repair for it is emitted instead. A repair computed against a value that is no longer current is discarded rather than delivered, with two exceptions: a repair whose target block can't yet be identified keeps flushing on its usual schedule instead of risking a silent drop, and a repair overtaken by another client's own patches to the same document is still delivered and converges with the later write, the same as any other concurrent edit. A later value that still shows the exact shape a block was just repaired from is recognized as the host not having caught up yet rather than a fresh defect: no repair is recomputed for it, and a repair already pending for that block is not discarded as superseded.
- Mutations still held when the editor unmounts are delivered to `mutation` listeners during unmount. A host that rejects mutations while read-only loses them there, as it did before.
- A block missing its `_key` no longer triggers the "invalid value" prompt. It is repaired like the other defects, emitting the same events. The prompt still appears for defects that need a human decision (an unknown `_type`, a non-object block), and its resolution patches now address the defective block's position instead of possibly addressing the wrong block. A keyless child with such a defect is now named by its position in the prompt too, instead of showing an `undefined` key.
- `markDefs` that no span references are no longer removed when a value enters the editor. They are removed when the user next edits that block.

`InvalidValueResolution.autoResolve` is deprecated: the field remains on the type but is never set.

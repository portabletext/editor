---
'@portabletext/editor': patch
---

fix: emit `unset([])` when an edit removes the last block

Edits that leave the editor without content now end with `unset([])`, so a host applying the emitted patches holds no value, the same as when the user deletes the text of the last block.

This matters because the editor decides what to send on the next keystroke from what it believes the host holds. After these edits, the editor believed the host held nothing, while the host still held an empty array or an empty block. In the worst case the next keystroke sent a block the host already had, and the host ended up with two blocks with the same `_key`, which Studio shows as a "Non-unique keys" error in place of the input. Ending these edits with `unset([])` keeps the host and the editor in agreement.

Deleting a lone block object. Say the editor holds a single image and the user deletes it. The editor removed the image and showed its placeholder, but never told the host that the field was now empty, so the host held an empty array. The document kept that empty array, and queries that check whether the field is set, like GROQ's `defined()`, still found a value where the user had deleted everything. Now the deletion ends with `unset([])` and the host holds no value:

```ts
editor.send({type: 'delete.block', at: [{_key: 'image'}]})

// Emitted patches
unset([{_key: 'image'}])
unset([]) // new
```

Deleting the placeholder with `delete.block`. Say the editor has no value, so it shows its placeholder, and a behavior deletes that placeholder. The editor first sent the placeholder to the host so it could delete it there, which left the host holding an empty array, with the same effect on queries. Now the deletion ends with `unset([])` and the host holds no value:

```ts
editor.send({type: 'delete.block', at: [{_key: 'placeholder'}]})

// Emitted patches
setIfMissing([], [])
insert([placeholder], 'before', [0])
unset([{_key: 'placeholder'}])
unset([]) // new
```

Clearing the only block with `block.unset`. Say the editor holds one heading, and a behavior unsets its `children` and `style`. The editor repairs the block right away with an empty span and the default style, and sends the patches for all of it, so the host now holds an empty paragraph. That paragraph looks exactly like the placeholder the editor shows when there is no value, and the editor took it for one. When the user then typed, the editor sent the paragraph again as if the host had nothing, and the host ended up with two blocks with the same `_key`. Now the repair ends with `unset([])`. The host holds no value, which matches what the editor shows, and the first keystroke creates the block once:

```ts
editor.send({
  type: 'block.unset',
  at: [{_key: 'block'}],
  props: ['children', 'style'],
})

// Emitted patches
unset([{_key: 'block'}, 'children'])
unset([{_key: 'block'}, 'style'])
set('normal', [{_key: 'block'}, 'style'])
set([], [{_key: 'block'}, 'children'])
setIfMissing([], [{_key: 'block'}, 'children'])
insert([span], 'before', [{_key: 'block'}, 'children', 0])
unset([]) // new
```

If the repaired block isn't an empty paragraph, for example because only the text was removed and it's still a heading, it stays stored and typing edits it as usual.

Pasting over a selection of only block objects. Say the editor holds two images, the user selects both and pastes text. The editor removes both images before inserting the pasted text, so for a moment it has no content. Nothing went wrong here before, and the host still ends up with the pasted text. The patches change because the editor now clears the field whenever it runs out of content, and rebuilds it for the pasted text:

```ts
const dataTransfer = new DataTransfer()
dataTransfer.setData('text/plain', 'foo')

editor.send({
  type: 'clipboard.paste',
  originEvent: {dataTransfer},
  position: {selection: bothImagesSelection},
})

// Emitted patches
unset([{_key: 'imageB'}])
unset([{_key: 'imageA'}])
unset([]) // new
setIfMissing([], [])
// ...the inserts of the pasted text
```

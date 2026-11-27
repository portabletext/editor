---
'@portabletext/editor': patch
---

fix: address the item counted from the end when its key is empty or shared with a sibling

A remote patch at a negative index now changes the item counted from the end of the array, like Sanity, even when that item's key is empty or shared with a sibling. Before, such a patch could land on another item with the same key.

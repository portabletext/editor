---
'@portabletext/editor': patch
---

fix: remove the container when `delete.block` targets a container

Sending `delete.block` with the path of a container now removes the container and everything in it. Previously it removed the blocks inside the container and left the empty container in the document:

```ts
editor.send({type: 'delete.block', at: [{_key: 'code1'}]})
// Previously left {_type: 'code-block', _key: 'code1', lines: []}
```

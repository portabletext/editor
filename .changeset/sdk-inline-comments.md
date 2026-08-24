---
'@portabletext/plugin-sdk-value': minor
---

feat: add inline comment decorations and authoring

Two new hooks bring Sanity's inline comments to SDK apps that embed the editor. `useSDKCommentDecorations` returns `RangeDecoration[]` for the open comment threads anchored to text in the field; pass it to `SDKPortableTextEditable` (or a raw `PortableTextEditable`) through `rangeDecorations`:

```tsx
const decorations = useSDKCommentDecorations({
  ...documentHandle,
  path: 'content',
  renderDecoration: (comment) => (props) => (
    <span data-comment-id={comment.id} style={{background: '#fef3c7'}}>
      {props.children}
    </span>
  ),
})

return (
  <SDKPortableTextEditable
    {...documentHandle}
    path="content"
    rangeDecorations={decorations}
  />
)
```

`useSDKCommentAuthoring` is the write side: `commentableSelection` is set when the current selection can take a comment, and `createInlineComment` starts a thread anchored to that selection:

```tsx
const {commentableSelection, createInlineComment} = useSDKCommentAuthoring({
  ...documentHandle,
  path: 'content',
})
// show the composer while `commentableSelection` is set, then:
await createInlineComment({message})
```

The types their signatures reference (`UseSDKCommentDecorationsOptions`, `RenderCommentDecorationFunction`, `UseSDKCommentAuthoringOptions`, `SDKCommentAuthoring`) are exported alongside them.

Highlights follow the text while the user types, and a highlight whose text is deleted or rewritten beyond recognition is dropped rather than drawn on the wrong words. Comments are written in the shape Sanity Studio stores, so threads round-trip between an SDK app and the Studio. The composer UI is the app's to render, the same split presence uses for carets. Requires `@sanity/sdk-react` 2.20.1 or later.

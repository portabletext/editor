---
'@portabletext/plugin-sdk-value': major
---

feat!: draw SDK comments and presence through decoration layers

The SDK's value sync, presence carets and comment highlights are now three plugins you mount next to your own `PortableTextEditable`: `SDKValuePlugin`, `SDKPresencePlugin` and `SDKCommentsPlugin`. Mount only the ones your app uses, because none needs another to be mounted. Carets and highlights each draw through their own decoration layer, so your own decorations sit beside them through `useDecorationLayer` from `@portabletext/plugin-decorations` instead of sharing one `rangeDecorations` array, and `PortableTextEditable` takes its props directly. `SDKPortableTextEditable` and `SDKPortableTextEditableProps` are removed. `SDKPresencePlugin` takes `renderCursor` (a function, or `null` to draw none) and `SDKCommentsPlugin` takes `renderDecoration`. Both take the document handle and `path`. `SDKCommentsPlugin` suspends while the comments load, so wrap it in `Suspense` where the app should show a fallback.

```tsx
// Before
function Editor() {
  const commentDecorations = useSDKCommentDecorations({
    ...documentHandle,
    path: 'content',
    renderDecoration,
  })

  return (
    <SDKPortableTextEditable
      {...documentHandle}
      path="content"
      renderCursor={renderCursor}
      rangeDecorations={commentDecorations}
      style={{minHeight: 120}}
    />
  )
}

<EditorProvider initialConfig={{schemaDefinition}}>
  <Editor />
</EditorProvider>

// After
<EditorProvider initialConfig={{schemaDefinition}}>
  <SDKValuePlugin {...documentHandle} path="content" />
  <SDKPresencePlugin {...documentHandle} path="content" renderCursor={renderCursor} />
  <Suspense fallback={null}>
    <SDKCommentsPlugin {...documentHandle} path="content" renderDecoration={renderDecoration} />
  </Suspense>
  <PortableTextEditable style={{minHeight: 120}} />
</EditorProvider>
```

`SDKPresencePlugin` and `SDKCommentsPlugin` are built on `useSDKPresenceCursors` and `useSDKCommentDecorations`. Those hooks return a `DecorationLayer` and draw themselves, so their results no longer need to be passed anywhere. Use them when your own component needs the layer. Decorations of your own, which you passed through `rangeDecorations`, now go through `useDecorationLayer`:

```tsx
// Before
<SDKPortableTextEditable rangeDecorations={decorations} />
// After
function Host() {
  useDecorationLayer({decorations})
  return <PortableTextEditable />
}
```

`@portabletext/plugin-decorations` is now a dependency. Both hooks must run inside `EditorProvider`. `useSDKCommentAuthoring` needs the live editor too, so it is the one hook an app still calls from its own component inside the provider.

Comment highlights follow edits while their anchor text still resolves. Comments spanning several blocks highlight every anchored block, including several anchored members in the same block. A highlight whose anchor text can no longer be found stays hidden until any content in the comment list changes, including replies and reactions. A content change resolves and places every anchor again from its anchor text.

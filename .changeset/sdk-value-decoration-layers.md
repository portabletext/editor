---
'@portabletext/plugin-sdk-value': major
---

feat!: draw SDK comments and presence through decoration layers

`SDKPortableTextEditable` and `SDKPortableTextEditableProps` are removed. Render `PortableTextEditable` from `@portabletext/editor` yourself and mount one plugin for each part as children of `EditorProvider`. `SDKValuePlugin` syncs the value. `SDKPresencePlugin` reports the local caret and draws remote carets, and takes `renderCursor` (a function, or `null` to draw none). The new `SDKCommentsPlugin` draws comment highlights and takes `renderDecoration`. Both take the document handle and `path`, and both draw through decoration layers, so an app no longer needs an inner component that passes `rangeDecorations`. `SDKCommentsPlugin` suspends while the comments load, so wrap it in `Suspense` where the app should show a fallback. Because you render `PortableTextEditable`, its props no longer pass through a wrapper that has to keep document handle fields off the DOM.

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

Comment highlights follow edits while their stored text still resolves. Comments spanning several blocks highlight every anchored block, including several stored members in the same block. A highlight whose stored text can no longer be found stays hidden until any content in the comment list changes, including replies and reactions. A content change resolves and places every anchor again from its stored text.

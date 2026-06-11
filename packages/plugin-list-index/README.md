# `@portabletext/plugin-list-index`

A helper plugin for calculating list indices for flat blocks based on `listItem` and `level`.

Portable Text has no nested list structure: a list is a run of flat sibling blocks carrying `listItem` and `level` properties. That makes the 1-based position of an item within its list a _derived_ value: same-type items count up across consecutive blocks on the same level, deeper levels restart at 1, and non-list blocks break the sequence. This plugin derives it for you and keeps it correct as the value changes.

```tsx
import {ListIndexProvider, useListIndex} from '@portabletext/plugin-list-index'

function MyEditor() {
  return (
    <EditorProvider initialConfig={...}>
      <ListIndexProvider>
        <PortableTextEditable />
      </ListIndexProvider>
    </EditorProvider>
  )
}
```

Typical use: custom text-block renders (`defineTextBlock`) that need to render numbered list markers, since the engine's default list-item wrapping (and the index it computes) does not apply to custom renders. Call `useListIndex` from a component the render returns, not inline in the `render` callback (it is a hook):

```tsx
function TextBlock(props: TextBlockRenderProps) {
  const listIndex = useListIndex(props.path)
  return <div {...props.attributes}>{props.children}</div>
}

defineTextBlock({type: '*', render: (props) => <TextBlock {...props} />})
```

The index map is rebuilt at most once per editor operation, regardless of how many components read it, and only for operations that can affect list indices: text insertions/removals and operations nested deeper than the root are skipped. Reads via `useListIndex` re-render only when the index at their own path changes.

Because the plugin observes every change source (local edits, remote patches, value sync, normalization), indices are correct on first render and stay correct when collaborators change the document.

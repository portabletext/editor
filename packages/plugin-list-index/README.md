# `@portabletext/plugin-list-index`

> Compute the list index of each list item for custom list rendering

## Installation

```sh
npm install @portabletext/plugin-list-index
```

## Usage

The [Render lists](https://www.portabletext.org/editor/guides/render-lists/) guide walks through the full setup, including CSS for bulleted and numbered lists.

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

The plugin is for text-block renders registered with `defineTextBlock`. The engine does not number list items for you, so your render decides how the number shows up. Read it with `useListIndex`, from a component the render returns. It is a hook, so it can't run inline in the `render` callback.

The most flexible setup puts the list information on the wrapper as `data-*` attributes and lets CSS draw the markers:

```tsx
import {defineTextBlock, type TextBlockRenderProps} from '@portabletext/editor'
import {useListIndex} from '@portabletext/plugin-list-index'

function TextBlock(props: TextBlockRenderProps) {
  // The 1-based position within the list, or `undefined` for a block that
  // is not a list item.
  const listIndex = useListIndex(props.path)

  return (
    <div
      {...props.attributes}
      data-list-item={props.node.listItem}
      data-level={props.node.level}
      data-list-index={listIndex}
    >
      {props.children}
    </div>
  )
}

const textBlock = defineTextBlock({
  type: 'block',
  render: (props) => <TextBlock {...props} />,
})
```

Mount `textBlock` through `NodePlugin` like any other registration. React leaves out attributes whose value is `undefined`, so blocks that are not list items render without them.

With the attributes in place, a few lines of CSS draw the markers and indent nested levels:

```css
[data-list-item] {
  display: flex;
  gap: 0.5rem;
}

[data-list-item='number']::before {
  content: attr(data-list-index) '.';
}

[data-list-item='bullet']::before {
  content: '●';
}

[data-level='2'] {
  padding-left: 1em;
}

[data-level='3'] {
  padding-left: 2em;
}
```

`attr()` prints the index as a plain number. For a different numbering style per level (`1.`, `a.`, `i.`), use one CSS counter per level: set it to 1 on an item whose `data-list-index` is `1`, and increment it on every other item. The [basic example](https://github.com/portabletext/editor/tree/main/examples/basic) does this for all ten levels, in [`App.tsx`](https://github.com/portabletext/editor/blob/main/examples/basic/src/App.tsx) and [`editor.css`](https://github.com/portabletext/editor/blob/main/examples/basic/src/editor.css).

If you'd rather render the marker yourself, output the index directly:

```tsx
function TextBlock(props: TextBlockRenderProps) {
  const listIndex = useListIndex(props.path)

  return (
    <div {...props.attributes}>
      {listIndex !== undefined ? (
        <span contentEditable={false}>{listIndex}. </span>
      ) : null}
      {props.children}
    </div>
  )
}
```

List items inside a [container](https://www.portabletext.org/editor/concepts/containers/) number within their own array, so a list in a callout starts at 1 no matter what comes before the callout.

The index map is rebuilt at most once per burst of operations, however many components read it, and only when the burst contains an operation that can change list indices (text insertions and removals can't). Reads via `useListIndex` re-render only when the index at their own path changes.

Because the plugin observes every change source (local edits, remote patches, value sync, normalization), indices are correct on first render and stay correct when collaborators change the document.

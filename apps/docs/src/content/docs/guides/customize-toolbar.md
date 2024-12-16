---
title: Customize the toolbar
description: TBD
---

The [getting started guide](/getting-started/) introduces the basics of setting up toolbar components. This guide provides some extra context, best practices, and patterns to get you started.

## Render the toolbar inside the provider

You must render any toolbars within `EditorProvider`, as it requires access to the instance of the editor. This is done with the `userEditor` hook.

```tsx
import {useEditor} from '@portabletext/editor'

function Toolbar() {
  const editor = useEditor()
}
```

## Use the schema as a foundation

Rather than write each control manually, generate the toolbar based on the schema. You may need to export and import your schema if working in multiple files. Alternatively, you can pass the schema as props to the toolbar.

Here's an example from the editor playground:

```tsx
// In the editor
<PortableTextToolbar schemaDefinition={schemaDefinition} />
```

Map over the schema's categories to generate each section of your toolbar.

```tsx
const decoratorButtons = schemaDefinition.decorators.map((decorator) => (
  <button
    key={decorator.name}
    onClick={() => {
      editor.send({
        type: 'decorator.toggle',
        decorator: decorator.name,
      })
      editor.send({type: 'focus'})
    }}
  >
    {decorator.name}
  </button>
))
```

## Use selectors to reflect editor state

The PTE ships with a collection of helpful selectors. Selectors are pure functions that derive state from the editor context. You can find the full list in the [selectors reference](/reference/selectors/).

A few useful selectors for using in the toolbar are:

- `getActiveStyle`: Get's the active style of the selection.
- `isActiveDecorator`: Returns `true` if the active selection matches the decorator.
- `isActiveAnnotation`: Returns `true` if the active selection matches the annotation.
- `isActiveStyle`: Returns `true` if the active selection matches the style.

You can import each selector individually from `@portabletext/editor/selectors` or import them all.

```tsx
import * as selectors from '@portabletext/editor/selectors'
```

You can then combine these with the `useEditorSelector` hook in your toolbar components. For example, this button will underline if the selected text matches the annotation.

```tsx
function AnnotationButton(props: {
  annotation: SchemaDefinition['annotations'][number]
}) {
  const editor = useEditor()
  // useEditorSelector takes the editor context and the selector
  const active = useEditorSelector(
    editor,
    selectors.isActiveAnnotation(props.annotation.name),
  )

  return (
    <button
      key={props.annotation.name}
      style={{
        textDecoration: active ? 'underline' : 'none',
      }}
      // ...
    >
      {props.annotation.name}
    </button>
  )
}
```

## Send events from toolbar items

You can send [synthetic events](/reference/behavior-api/) from within the toolbar using `editor.send`.

```tsx
// import and set up useEditor
import { useEditor } from '@portabletext/editor'
// ...
const editor = useEditor()
// ...
<button
    onClick={() => {
        editor.send({
            type: 'decorator.toggle',
            decorator: 'strong'
        })
        editor.send({type: 'focus'})
    }}
>
Toggle Bold
</button>
```

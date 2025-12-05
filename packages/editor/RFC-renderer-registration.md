# RFC: Renderer Registration API for Portable Text Editor

## Summary

This RFC proposes a `registerRenderer` API that allows plugins to register custom rendering for PTE nodes, giving full control over DOM output while keeping existing render props as fallback defaults.

## Design Goals

- **Plugin-first**: Registered renderers take priority over prop-based render functions
- **Full DOM control**: Ability to customize or replace wrapper elements, attributes, drop indicators
- **Non-breaking**: Existing `renderBlock`, `renderChild`, etc. props continue to work as defaults
- **Consistent**: API mirrors `registerBehavior` pattern
- **Rendering-only**: Does NOT allow dynamic schema definition (schema stays in Sanity config)
- **Great TypeScript inference**: Schema generic + `name` enables typed `node` in render callback
- **No Slate exposure**: Renderers use PTE hooks (`useEditor`, `useEditorSelector`) for state

## Proposed API

```typescript
import {schema} from './schema'
import {useEditor, useEditorSelector} from '@portabletext/editor'

editor.registerRenderer<typeof schema>({
  type: 'blockObject',
  name: 'image',
  render: ({attributes, children, node}) => (
    <ImageRenderer attributes={attributes} node={node}>
      {children}
    </ImageRenderer>
  ),
})

// Standalone component uses hooks for state
function ImageRenderer({attributes, children, node}) {
  const editor = useEditor()
  const isReadOnly = useEditorSelector(editor, (s) => s.context.readOnly)
  const selection = useEditorSelector(editor, (s) => s.context.selection)
  const isFocused = /* derive from selection */

  return (
    <figure {...attributes} className={isFocused ? 'focused' : ''}>
      <img src={node.url} alt={node.alt} />
      {children}
    </figure>
  )
}

// Register via plugin component
<RendererPlugin renderers={[imageRenderer, videoRenderer]} />
```

## Renderer Types

| Type           | What it covers              | Base node type          | Replaces                                       |
| -------------- | --------------------------- | ----------------------- | ---------------------------------------------- |
| `block`        | Paragraphs, headings, lists | `PortableTextTextBlock` | `renderBlock`, `renderStyle`, `renderListItem` |
| `blockObject`  | Images, embeds, etc.        | `PortableTextObject`    | `renderBlock` (for objects)                    |
| `inlineObject` | Mentions, emoji, etc.       | `PortableTextObject`    | `renderChild` (for objects)                    |
| `decorator`    | Bold, italic, code          | `string`                | `renderDecorator`                              |
| `annotation`   | Links, comments             | `PortableTextObject`    | `renderAnnotation`                             |

## Type-safe Rendering

| Property          | Purpose                                               |
| ----------------- | ----------------------------------------------------- |
| `<typeof schema>` | Generic for TypeScript type inference                 |
| `name`            | Plucks the specific type AND runtime `_type` matching |

## Render Props

| Prop            | Description                                |
| --------------- | ------------------------------------------ |
| `attributes`    | Slate attributes to spread on root element |
| `children`      | Slate children (required for DOM tracking) |
| `node`          | The typed node being rendered              |
| `renderDefault` | Compose with built-in rendering            |
| `renderHidden`  | Render minimal hidden DOM                  |

## Using Hooks for State

Renderers use PTE hooks for additional state (no Slate exposure):

```typescript
import {useEditor, useEditorSelector} from '@portabletext/editor'

function MyRenderer({attributes, children, node}) {
  const editor = useEditor()
  const isReadOnly = useEditorSelector(editor, (s) => s.context.readOnly)
  const selection = useEditorSelector(editor, (s) => s.context.selection)
  const decoratorState = useEditorSelector(editor, (s) => s.decoratorState)
  const blockIndex = useEditorSelector(editor, (s) => s.blockIndexMap.get(node._key))

  return <div {...attributes}>{children}</div>
}
```

## Examples

### blockObject - Standalone component

```typescript
function ImageBlock({attributes, children, node}: BlockObjectRenderProps<ImageBlock>) {
  const editor = useEditor()
  const isReadOnly = useEditorSelector(editor, (s) => s.context.readOnly)
  const selection = useEditorSelector(editor, (s) => s.context.selection)
  const isFocused = selection?.focus.path[0]?._key === node._key

  if (isReadOnly && node.draft) {
    return <HiddenBlock attributes={attributes}>{children}</HiddenBlock>
  }

  return (
    <figure {...attributes} className={isFocused ? 'focused' : ''}>
      <img src={node.url} alt={node.alt} />
      {children}
    </figure>
  )
}

editor.registerRenderer<typeof schema>({
  type: 'blockObject',
  name: 'image',
  render: (props) => <ImageBlock {...props} />,
})
```

### decorator - With decorator state

```typescript
function HighlightDecorator({children}: DecoratorRenderProps) {
  const editor = useEditor()
  const isBoldToo = useEditorSelector(editor, (s) => s.decoratorState.bold)

  return <mark className={isBoldToo ? 'bold-highlight' : 'highlight'}>{children}</mark>
}

editor.registerRenderer<typeof schema>({
  type: 'decorator',
  name: 'highlight',
  render: (props) => <HighlightDecorator {...props} />,
})
```

## Resolution Order

1. Registered renderers (by priority, highest first)
2. Render props passed to `PortableTextEditable`
3. Built-in default renderers

## Key Files to Modify

- `packages/editor/src/editor/create-editor.ts` - Add `registerRenderer` method
- `packages/editor/src/editor/editor-machine.ts` - Store renderer configs in context
- `packages/editor/src/editor/components/render-*.tsx` - Integrate renderer lookup
- `packages/editor/src/types/editor.ts` - Add renderer type definitions
- New: `packages/editor/src/renderers/` - Renderer types, helpers, plugin component

## Design Decisions

### 1. Skipping/Hiding Rendering

Provide `renderHidden()` helper (returning `null` breaks Slate):

```tsx
render: ({renderHidden, node}) => {
  if (node.draft) return renderHidden()
  return <MyComponent />
}
```

### 2. Slate Attributes

Users spread `attributes` on root element (required by Slate):

```tsx
render: ({attributes, children}) => <div {...attributes}>{children}</div>
```

### 3. Default Render Composition

Use `renderDefault()` to wrap built-in rendering:

```tsx
render: ({renderDefault}) => <div className="wrapper">{renderDefault()}</div>
```

## Implementation Phases

### Phase 1: Core Infrastructure

- Define renderer types with schema generic + name-based type plucking
- Add renderer storage to editor actor context
- Implement `registerRenderer` method on editor instance

### Phase 2: Integration

- Modify render components to check for registered renderers
- Implement priority-based resolution
- Ensure Slate compatibility constraints

### Phase 3: Plugin Component

- Create `RendererPlugin` component (like `BehaviorPlugin`)
- Documentation and examples

### Phase 4: Testing

- Test with existing plugins
- Verify no breaking changes to render props
- Performance testing

## Open Questions

- Should we provide convenience hooks like `useNodeFocused(nodeKey)` and `useNodeSelected(nodeKey)`?
- How should priority work when multiple renderers match the same type/name?
- Range decorations: keep current inline `component` approach or unify later?

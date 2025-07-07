# `@portabletext/toolbar`

Powered by [Behaviors](https://www.portabletext.org/concepts/behavior/) and [State Machines](https://stately.ai/docs/xstate), `@portabletext/toolbar` is a collection of robust React hooks for building toolbars and related UI components
for the Portable Text editor.

Refer to the toolbar in the [Portable Text Playground](../../apps/playground/) for a comprehensive example.

## Features

- **Schema Extension**: Extend the editor's schema with default values, icons, shortcuts and more. This makes it easier to use the schema to render toolbars, forms and other UI components.
- **Hooks**: Headless React hooks to help building UI components for toggle buttons, popovers and insert dialogs.
- **Keyboard Shortcuts**: Seamless integration with `@portabletext/keyboard-shortcuts` for platform-aware shortcuts.

## Installation

```bash
npm install @portabletext/toolbar
```

## Basic Example

```tsx
import {bold, link} from '@portabletext/keyboard-shortcuts'
import {
  useDecoratorButton,
  useHistoryButtons,
  useToolbarSchema,
  type ExtendAnnotationSchemaType,
  type ExtendDecoratorSchemaType,
} from '@portabletext/toolbar'

/**
 * 1. Define extensions for your schema types
 */
const extendDecorator: ExtendDecoratorSchemaType = (decorator) => {
  if (decorator.name === 'strong') {
    return {
      ...decorator,
      icon: BoldIcon,
      shortcut: bold,
    }
  }

  return decorator
}
const extendAnnotation: ExtendAnnotationSchemaType = (annotation) => {
  if (annotation.name === 'link') {
    return {
      ...annotation,
      icon: LinkIcon,
      defaultValues: {
        href: 'https://example.com',
      },
      shortcut: link,
    }
  }

  return annotation
}

/**
 * 2. Create a Toolbar plugin that can be used inside an `EditorProvider`.
 */
function ToolbarPlugin() {
  /**
   * 3. Obtain a `ToolbarSchema` by extending the `EditorSchema`.
   */
  const toolbarSchema = useToolbarSchema({
    extendDecorator,
    extendAnnotation,
    // extendStyle,
    // extendList,
    // extendBlockObject,
    // extendInlineObject,
  })

  /**
   * 4. Render the toolbar
   */
  return (
    <div>
      {toolbarSchema.decorators?.map((decorator) => (
        <DecoratorButton key={decorator.name} schemaType={decorator} />
      ))}
      {toolbarSchema.annotations?.map((annotation) => {
        /** ... */
      })}
      <HistoryButtons />
    </div>
  )
}

function DecoratorButton(props: {schemaType: ToolbarDecoratorSchemaType}) {
  /**
   * 5. Use the provided hooks to manage state, set up keyboard shortcuts and
   * more.
   */
  const decoratorButton = useDecoratorButton(props)

  return (
    <button
      onClick={() => decoratorButton.send({type: 'toggle'})}
      disabled={decoratorButton.snapshot.matches('disabled')}
      className={
        decoratorButton.snapshot.matches({enabled: 'active'}) ? 'active' : ''
      }
      title={props.schemaType.shortcut?.description}
    >
      {props.schemaType.icon && <props.schemaType.icon />}
      {props.schemaType.title}
    </button>
  )
}

function HistoryButtons() {
  const historyButtons = useHistoryButtons()

  return (
    <>
      <button
        onClick={() => historyButtons.send({type: 'history.undo'})}
        disabled={historyButtons.snapshot.matches('disabled')}
      >
        Undo
      </button>
      <button
        onClick={() => historyButtons.send({type: 'history.redo'})}
        disabled={historyButtons.snapshot.matches('disabled')}
      >
        Redo
      </button>
    </>
  )
}
```

## Hooks

### `useToolbarSchema`

Extends the editor's schema with default values, icons, shortcuts and more to make it easier to render toolbars, forms and other UI components.

```typescript
function useToolbarSchema(props: {
  extendDecorator?: (
    decorator: DecoratorSchemaType,
  ) => ToolbarDecoratorSchemaType
  extendAnnotation?: (
    annotation: AnnotationSchemaType,
  ) => ToolbarAnnotationSchemaType
  extendList?: (list: ListSchemaType) => ToolbarListSchemaType
  extendBlockObject?: (
    blockObject: BlockObjectSchemaType,
  ) => ToolbarBlockObjectSchemaType
  extendInlineObject?: (
    inlineObject: InlineObjectSchemaType,
  ) => ToolbarInlineObjectSchemaType
  extendStyle?: (style: StyleSchemaType) => ToolbarStyleSchemaType
}): ToolbarSchema
```

### `useDecoratorButton`

Manages the state and behavior of decorator toggle buttons (bold, italic, etc.) with keyboard shortcut support.

```typescript
function useDecoratorButton(props: {
  schemaType: ToolbarDecoratorSchemaType
}): DecoratorButton
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'toggle'}`

### `useAnnotationButton`

Manages the state and behavior of annotation buttons in the toolbar. Handles adding/removing annotations, keyboard shortcuts, and dialog interactions.

```typescript
function useAnnotationButton(props: {
  schemaType: ToolbarAnnotationSchemaType
}): AnnotationButton
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'add'}`, `{type: 'remove'}`, `{type: 'open dialog'}`, `{type: 'close dialog'}`

### `useAnnotationPopover`

Provides state management for annotation popover dialogs, including form handling and validation.

```typescript
function useAnnotationPopover(props: {
  schemaTypes: ReadonlyArray<ToolbarAnnotationSchemaType>
}): AnnotationPopover
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method and `context` containing active annotations
- `send`: Function to dispatch events like `{type: 'remove'}`, `{type: 'edit'}`, `{type: 'close'}`

### `useStyleSelector`

Manages style selection (headings, paragraphs, etc.) with keyboard shortcut support.

```typescript
function useStyleSelector(props: {
  schemaTypes: ReadonlyArray<ToolbarStyleSchemaType>
}): StyleSelector
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method and `context.activeStyle`
- `send`: Function to dispatch events like `{type: 'toggle', style: 'h1'}`

### `useListButton`

Manages list item toggle buttons (bullet lists, numbered lists, etc.).

```typescript
function useListButton(props: {schemaType: ToolbarListSchemaType}): ListButton
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'toggle'}`

### `useBlockObjectButton`

Manages insertion of block objects like images into the editor.

```typescript
function useBlockObjectButton(props: {
  schemaType: ToolbarBlockObjectSchemaType
}): BlockObjectButton
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'open dialog'}`, `{type: 'insert'}`

### `useBlockObjectPopover`

Provides state management for block object insertion dialogs.

```typescript
function useBlockObjectPopover(props: {
  schemaType: ToolbarBlockObjectSchemaType
}): BlockObjectPopover
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'open dialog'}`, `{type: 'close dialog'}`, `{type: 'insert'}`

### `useInlineObjectButton`

Manages insertion of inline objects into the editor.

```typescript
function useInlineObjectButton(props: {
  schemaType: ToolbarInlineObjectSchemaType
}): InlineObjectButton
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'open dialog'}`, `{type: 'insert'}`

### `useInlineObjectPopover`

Provides state management for inline object insertion dialogs.

```typescript
function useInlineObjectPopover(props: {
  schemaType: ToolbarInlineObjectSchemaType
}): InlineObjectPopover
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'open dialog'}`, `{type: 'close dialog'}`, `{type: 'insert'}`

### `useHistoryButtons`

Provides undo/redo functionality for the editor.

```typescript
function useHistoryButtons(): HistoryButtons
```

**Returns:** An object with:

- `snapshot`: Current state snapshot with `matches()` method
- `send`: Function to dispatch events like `{type: 'history.undo'}`, `{type: 'history.redo'}`

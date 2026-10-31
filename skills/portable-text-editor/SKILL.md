---
name: portable-text-editor
description: Building or changing a rich text editor with @portabletext/editor (the Portable Text Editor). Load it before adding keyboard behaviour, Enter or Tab handling, typed shortcuts, paste handling, mention or slash pickers, toolbars or floating menus, UI that reads editor state, saving or syncing the value with a backend, switching documents, or tests for any of these. It names the mechanism to use for each intent and the rules agents get wrong.
---

# Building with the Portable Text Editor

`@portabletext/editor` is not a controlled React input and not a DOM you patch by hand. Every user action becomes an editor event, and you change what an event does by registering a Behavior: a guard that decides whether it applies and actions that raise other events. The ready-made plugins are Behaviors plus a state machine for the hard part. Before you write a `keydown` listener, a DOM caret calculation or a `useState` mirror of the value, find your intent in the table below.

## Decision table

| Intent                                                                          | Mechanism                                                                                                                                                                  | Package                                                    | What agents do wrong                                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Change what Enter, Backspace, typing or paste does somewhere                    | Behavior on the semantic event (`insert.break`, `delete.backward`, `insert.text`, `deserialize.data`)                                                                      | `@portabletext/editor/behaviors`                           | `onKeyDown` on the editable, or a Behavior on `keyboard.keydown` for Enter                        |
| A key with no semantic event (Tab, Alt+Arrow, Escape, a custom hotkey)          | Behavior on `keyboard.keydown` with a `createKeyboardShortcut` guard                                                                                                       | `@portabletext/keyboard-shortcuts`                         | `event.key === 'Tab'` without pinning modifiers, so Shift+Tab matches too                         |
| A typed pattern becomes something else (`1. ` to a list, `:tag:` to an object)  | `defineInputRule` or `defineTextTransformRule` in `InputRulePlugin`                                                                                                        | `@portabletext/plugin-input-rule`                          | Hand-rolled `insert.text` Behavior with a regex over the block text, which breaks undo            |
| Smart quotes, em dashes, arrows, `(c)` and other typographic replacements       | `TypographyPlugin` (`preset`, `enable`, `disable`), or its exported rules such as `rightArrowRule` in `InputRulePlugin`                                                    | `@portabletext/plugin-typography`                          | Writing the rules again with `defineTextTransformRule`                                            |
| Markdown-style shortcuts (`# `, `> `, `**bold**`)                               | `MarkdownShortcutsPlugin`                                                                                                                                                  | `@portabletext/plugin-markdown-shortcuts`                  | Writing the rules again                                                                           |
| Text between a pair of characters gets a decorator (`#foo#` to italic)          | `CharacterPairDecoratorPlugin` with `decorator` and `pair`                                                                                                                 | `@portabletext/plugin-character-pair-decorator`            | An input rule that deletes the characters and toggles the mark by hand                            |
| A trigger character opens a picker (`@`, `/`)                                   | `defineTypeaheadPicker` plus `useTypeaheadPicker`                                                                                                                          | `@portabletext/plugin-typeahead-picker`                    | A scanner for the trigger plus DOM caret math and a global keydown listener                       |
| `:` opens an emoji picker                                                       | `useEmojiPicker` with `createMatchEmojis`                                                                                                                                  | `@portabletext/plugin-emoji-picker`                        | Building the emoji picker on `defineTypeaheadPicker` from scratch                                 |
| Insert an inline object and keep typing after it                                | `insert.child`, then put the caret after it yourself                                                                                                                       | `@portabletext/editor/behaviors`                           | Assuming the caret ends up after the object. It stays on it                                       |
| Toolbar buttons with active and disabled state                                  | `useToolbarSchema`, `useDecoratorButton`, `useAnnotationButton`, `useStyleSelector`, `useListButton`, `useHistoryButtons`, `useBlockObjectButton`, `useInlineObjectButton` | `@portabletext/toolbar`                                    | `useState` for active marks, or the deprecated `PortableTextEditor` static methods                |
| Position a floating menu or popover at the selection                            | `editor.dom.getSelectionRect(editor.getSnapshot())`                                                                                                                        | `@portabletext/editor`                                     | `window.getSelection().getRangeAt(0).getBoundingClientRect()`                                     |
| UI inside or outside the editor reads editor state                              | `useEditorSelector(editor, selector)`                                                                                                                                      | `@portabletext/editor`, `/selectors`                       | Mirroring the value into React state from `mutation` events                                       |
| Move the caret programmatically (jump to a block)                               | `editor.send({type: 'select', at})` then `editor.send({type: 'focus'})`                                                                                                    | `@portabletext/editor`, `/utils`                           | Hand-built span paths, or forgetting `focus`                                                      |
| Save changes                                                                    | `editor.on('mutation', ...)` or `EventListenerPlugin`                                                                                                                      | `@portabletext/editor`                                     | Treating `initialValue` as controlled                                                             |
| Apply someone else's changes while the user types                               | `editor.send({type: 'patches', patches, snapshot})` with `origin: 'remote'`                                                                                                | `@portabletext/editor`, `@portabletext/patches`            | `update value` with the server value, which drops in-flight typing. Or declaring it impossible    |
| Bind the editor to a field in a Sanity document from a Sanity SDK app           | `SDKPortableTextEditable`, or `SDKValuePlugin` next to your own `PortableTextEditable`                                                                                     | `@portabletext/plugin-sdk-value`                           | Hand-wiring `mutation` and `patches` to the SDK document                                          |
| Open a different document in the same editor                                    | Remount: `<EditorProvider key={documentId}>`                                                                                                                               | `@portabletext/editor`                                     | `update value` with the other document, which keeps the old undo stack                            |
| Paste: URL on a selection becomes a link                                        | `PasteLinkPlugin`                                                                                                                                                          | `@portabletext/plugin-paste-link`                          | A `paste` DOM listener                                                                            |
| Paste: custom format or conversion                                              | Behavior on `deserialize.data` raising `deserialization.success`                                                                                                           | `@portabletext/editor/behaviors`, `@portabletext/markdown` | `onPaste` on the editable, or `clipboard.paste` with manual `getData`                             |
| A drop indicator while dragging blocks                                          | `DndProvider` plus `useDropPosition(path)` in the block render                                                                                                             | `@portabletext/plugin-dnd`                                 | Tracking pointer position over blocks with DOM listeners                                          |
| Numbered list markers in a custom block render                                  | `ListIndexProvider` plus `useListIndex(path)`                                                                                                                              | `@portabletext/plugin-list-index`                          | Counting sibling list items in the render                                                         |
| Find a node: parent container, sibling, enclosing block                         | Traversal functions                                                                                                                                                        | `@portabletext/editor/traversal`                           | Slicing paths by index or walking `value` by hand                                                 |
| Block-level questions at the caret (focus block, last line, text before caret)  | Selectors                                                                                                                                                                  | `@portabletext/editor/selectors`                           | Reading `snapshot.context.selection.focus.path[0]`                                                |
| Single-line input                                                               | `OneLinePlugin`                                                                                                                                                            | `@portabletext/plugin-one-line`                            | A Behavior that swallows Enter, which still lets a multi-block paste through                      |
| Highlights, search hits, comments                                               | `rangeDecorations` on `PortableTextEditable`, or `plugin-decorations`                                                                                                      | `@portabletext/editor`, `@portabletext/plugin-decorations` | Adding annotations or decorators for display, which end up in the saved value                     |
| Nested editable content (callouts, code blocks, tables)                         | `defineContainer({type, arrayField})` in `NodePlugin`, or `defineTable`                                                                                                    | `@portabletext/editor`, `@portabletext/plugin-table`       | A nested `EditorProvider` per block, or a flattened data model                                    |
| Convert a value to or from Markdown, or apply a Markdown edit to a stored value | `portableTextToMarkdown`, `markdownToPortableText`, `applyMarkdownEdit`                                                                                                    | `@portabletext/markdown`                                   | A hand-written serializer, or replacing the whole value with the converted edit, which loses keys |
| Test any of the above                                                           | `EditorProvider` + `EditorRefPlugin` + `PortableTextEditable` rendered in a browser test                                                                                   | `@portabletext/editor/plugins`                             | Importing `@portabletext/editor/test/vitest`, which is not a public export                        |

The editor's API entry points are `@portabletext/editor` and the subpaths `/behaviors`, `/plugins`, `/selectors`, `/traversal` and `/utils`. Other paths such as `/test/vitest` are internal and not exported.

## Behaviors

A Behavior has `on` (an event type), an optional `guard`, and `actions`, which is an array of action sets. Mount Behaviors with `BehaviorPlugin` inside `EditorProvider`. Your Behaviors run before the editor's own, in registration order.

```tsx
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {BehaviorPlugin} from '@portabletext/editor/plugins'
import {
  getFocusTextBlock,
  isSelectionCollapsed,
} from '@portabletext/editor/selectors'
import {isEmptyTextBlock} from '@portabletext/editor/utils'

const headingStyles = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

// Enter on an empty heading turns it back into a paragraph instead of
// splitting off another empty heading.
const resetEmptyHeadingOnEnter = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = getFocusTextBlock(snapshot)

    if (!focusTextBlock || !isSelectionCollapsed(snapshot)) {
      return false
    }

    if (!headingStyles.has(focusTextBlock.node.style ?? '')) {
      return false
    }

    return isEmptyTextBlock(snapshot.context, focusTextBlock.node)
      ? {focusTextBlock}
      : false
  },
  actions: [
    (_, {focusTextBlock}) => [
      raise({
        type: 'block.set',
        at: focusTextBlock.path,
        props: {style: 'normal'},
      }),
    ],
  ],
})

// Module scope: `BehaviorPlugin` re-registers whenever the array identity changes.
const behaviors = [resetEmptyHeadingOnEnter]

export function HeadingPlugin() {
  return <BehaviorPlugin behaviors={behaviors} />
}
```

### Pick the event

- Hook the semantic event when there is one. Enter is `insert.break`, Shift+Enter is `insert.soft break`, typing is `insert.text`, Backspace is `delete.backward`. A Behavior there also catches IME input and programmatic sends, which a `keyboard.keydown` Behavior for Enter misses.
- Paste does not go through `insert.text`. Pasted blocks arrive as `insert.blocks`, and plain text pasted into a text block arrives as `insert.span` with an `insert.break` between lines. A rule on `insert.text` alone does not constrain pasted content. Handle `insert.blocks` or `deserialize.data` too, as `OneLinePlugin` does.
- Use `keyboard.keydown` only for keys with no semantic event, such as Tab, Escape or a custom chord. Core list indentation is itself a `keyboard.keydown` Tab Behavior, and yours runs first. A guard that is too broad silently breaks list indent.
- Know the core rule before you add a competing one. Inside a container, Enter on an empty last line escapes only when the line above it is also empty (two Enters). A custom single-Enter escape is your own Behavior.

### Guard rules

- Return `false` when the Behavior does not apply. The event then falls through to the next Behavior and finally to core, so Enter elsewhere still splits and Tab elsewhere still moves focus.
- A guard that matches claims the native event and prevents the browser default, unless the last action set that returns actions has a `forward` and no `raise` or `execute` (an `effect` alongside the `forward` is fine). Such a set passes the event down the chain, and the browser default survives if no later Behavior claims it. To leave a key alone, return `false` from the guard. That is simpler than matching and then forwarding.
- To swallow a key on purpose without changing anything (Shift+Tab with nothing to outdent), match in the guard and return `[]` from the action set, or give the Behavior `actions: []`. An empty set changes nothing, so the guard's claim stands.
- Return an object from the guard to pass computed values to the actions as their second argument. With a custom event and an object guard response, give `defineBehavior` all three generics: `defineBehavior<Payload, 'custom.name', GuardResponse>`.

### raise, forward, execute

- `raise(event)` sends an event through the whole chain again, your Behaviors and core included. Use it for nearly everything: inserts, deletes, selects, style and mark changes.
- `forward(event)` means "no opinion here". The event continues to the Behaviors after this one. It does not mean "let the browser act".
- `execute(event)` skips every remaining Behavior, yours and core. The editor's abstract Behaviors, which turn high-level events into low-level ones, still run. It is rarely what you want. Reach for it only when you must bypass the chain on purpose.
- `effect(() => ...)` runs a side effect, such as calling your own API. It is not an editor change.
- Each action set after the first starts a new undo step. Put "let the input land" and "transform it" in separate sets when one undo should peel off only the transform.
- An action callback sees the snapshot from before its own raised events apply. A later action set sees what the earlier sets produced, but it starts a new undo step. When a later step needs state an earlier raise produced (a new key, a sibling) and both steps belong in one undo step, raise a custom event and do the second step in a companion Behavior on that event. Raised events apply in order, so the companion sees the result.

### Keys with no semantic event

`createKeyboardShortcut` only matches keys. It does nothing by itself. A modifier you leave out matches both pressed and not pressed, so pin every modifier you care about.

```tsx
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {getFocusBlock} from '@portabletext/editor/selectors'
import {createKeyboardShortcut} from '@portabletext/keyboard-shortcuts'

const moveBlockUpShortcut = createKeyboardShortcut({
  default: [
    {key: 'ArrowUp', alt: true, ctrl: false, meta: false, shift: false},
  ],
})

const moveBlockUpOnAltArrowUp = defineBehavior({
  on: 'keyboard.keydown',
  guard: ({snapshot, event}) => {
    if (!moveBlockUpShortcut.guard(event.originEvent)) {
      return false
    }

    const focusBlock = getFocusBlock(snapshot)

    return focusBlock ? {focusBlock} : false
  },
  actions: [
    (_, {focusBlock}) => [raise({type: 'move.block up', at: focusBlock.path})],
  ],
})
```

`@portabletext/keyboard-shortcuts` also exports ready-made shortcuts such as `bold`, `italic`, `link`, `undo` and `redo`. The editor's internal Tab and arrow shortcuts are not exported, so rebuild them with `createKeyboardShortcut`.

## Finding things in the tree

Block paths are keyed, not indexed, and blocks can sit inside containers (`[{_key: 'c1'}, 'content', {_key: 'b1'}]`). Never slice or index paths by hand.

- `@portabletext/editor/selectors` answers questions about the selection: `getFocusTextBlock`, `getFocusBlock`, `getFocusBlockObject`, `getBlockTextBefore`, `isSelectionCollapsed`, `isSelectionExpanded`, `isAtTheStartOfBlock`, `getActiveStyle`, `isActiveDecorator`, `isActiveAnnotation`.
- `getFirstBlock`, `getLastBlock`, `getNextBlock` and `getPreviousBlock` are scoped to the focus block's container. Inside a container, `getLastBlock` is its last line, not the document's last block.
- `@portabletext/editor/traversal` answers questions about any path: `getAncestor(snapshot, path, {match})`, `getParent`, `getSibling(snapshot, path, {direction: 'next'})`, `getChildren`, `getNode`, `getContainer`, `getEnclosingBlock`.
- `@portabletext/editor/utils` builds positions: `getBlockStartPoint({context, block})`, `getBlockEndPoint`, `blockOffsetsToSelection({snapshot, offsets})`, `getTextBlockText`, `isTextBlock`, `isEmptyTextBlock`.

To leave a container, raise `insert.block` with `placement: 'after'`, `at` a collapsed selection on the container's path, and `select: 'start'`. Core uses the same shape.

## Typed patterns

Use `@portabletext/plugin-input-rule` when typed text should become something else. It runs your rule once per insertion, against the block text up to the caret plus the inserted text. It also forwards the typed character in its own action set before your actions, so one undo restores what the user typed.

```tsx
import {raise} from '@portabletext/editor/behaviors'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'
import {rightArrowRule} from '@portabletext/plugin-typography'

// `>> ` at the start of a line turns the block into a blockquote.
const quoteRule = defineInputRule({
  on: /^>> $/,
  actions: [
    ({event}) =>
      event.matches.flatMap((match) => [
        raise({type: 'delete', at: match.targetOffsets}),
        raise({type: 'style.add', style: 'blockquote'}),
      ]),
  ],
})

const rules = [rightArrowRule, quoteRule]

export function ShortcutRules() {
  return <InputRulePlugin rules={rules} />
}
```

- For a plain text replacement, use `defineTextTransformRule({on, transform})`. Check `@portabletext/plugin-typography` first: it exports the common ones (`rightArrowRule`, `emDashRule`, `smartQuotesRules` and more), and `TypographyPlugin` mounts a preset of them.
- Delete and select with `match.targetOffsets`. `match.selection` stops at the caret and misses a character that the insertion added.
- `$` anchors to the end of the insertion, not the end of the block. `^` anchors to the start of the block text.
- Use named capture groups to read parts of the match: `match.groups['name']?.text`.
- If the rule inserts an inline object, read [references/inline-objects-and-pickers.md](references/inline-objects-and-pickers.md) first. The caret needs explicit handling.

## Trigger pickers

Use `@portabletext/plugin-typeahead-picker` for `@`, `/` and `:` menus. It tracks the keyword, handles ArrowUp, ArrowDown, Enter, Tab and Escape, and dismisses itself. You write `getMatches`, `onSelect` and the list UI.

```tsx
import {raise} from '@portabletext/editor/behaviors'
import {
  defineTypeaheadPicker,
  useTypeaheadPicker,
} from '@portabletext/plugin-typeahead-picker'

type Snippet = {id: string; label: string; text: string}

const snippets: Array<Snippet> = [
  {id: 'sig', label: 'Signature', text: 'Best regards, Foo'},
  {id: 'addr', label: 'Address', text: '1 Bar Street'},
]

const snippetPicker = defineTypeaheadPicker<Snippet>({
  trigger: /#/,
  keyword: /\w*/,
  getMatches: ({keyword}) =>
    snippets.filter((snippet) =>
      snippet.label.toLowerCase().startsWith(keyword.toLowerCase()),
    ),
  onSelect: [
    ({event}) => [
      raise({type: 'delete', at: event.patternSelection}),
      raise({type: 'insert.text', text: event.match.text}),
    ],
  ],
})

export function SnippetPicker() {
  const picker = useTypeaheadPicker(snippetPicker)

  if (picker.snapshot.matches('idle')) {
    return null
  }

  const {matches, selectedIndex} = picker.snapshot.context

  return (
    <ul role="listbox">
      {matches.map((match, index) => (
        <li
          key={match.id}
          role="option"
          aria-selected={index === selectedIndex}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => picker.send({type: 'navigate to', index})}
          onClick={() => picker.send({type: 'select'})}
        >
          {match.label}
        </li>
      ))}
    </ul>
  )
}
```

- Render the picker component inside `EditorProvider`, next to `PortableTextEditable`. Position it with `editor.dom.getSelectionRect`.
- In `onSelect`, delete `event.patternSelection` first. It covers the trigger and the keyword. Inserting does not replace it for you.
- Mouse support is opt-in. Wire `navigate to` and `select`, and prevent `mousedown` so the editor keeps its selection.
- The trigger must be a single character. A multi-character trigger such as `/;;/` never opens the picker.
- A trigger anchored with `^` (for example `/^\//`) only opens at the start of a block.
- To insert an inline object (a chip) from `onSelect`, follow [references/inline-objects-and-pickers.md](references/inline-objects-and-pickers.md).

## Toolbars and UI that reads editor state

`useEditor()` works anywhere under `EditorProvider` and throws outside it. `useEditorSelector(editor, selector, compare?)` subscribes a component to derived state and works with any `Editor` instance, inside or outside the provider.

```tsx
import {useEditor, useEditorSelector} from '@portabletext/editor'
import {isSelectionExpanded} from '@portabletext/editor/selectors'
import {
  useDecoratorButton,
  useToolbarSchema,
  type ToolbarDecoratorSchemaType,
} from '@portabletext/toolbar'
import {useEffect, useLayoutEffect, useState} from 'react'

export function SelectionMenu() {
  const editor = useEditor()
  const expanded = useEditorSelector(editor, isSelectionExpanded)
  const selection = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.selection,
  )
  const toolbarSchema = useToolbarSchema({})
  const [rect, setRect] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    setRect(expanded ? editor.dom.getSelectionRect(editor.getSnapshot()) : null)
  }, [editor, expanded, selection])

  // The rect is in viewport coordinates, so it moves when the page scrolls.
  useEffect(() => {
    if (!expanded) {
      return
    }

    const updateRect = () =>
      setRect(editor.dom.getSelectionRect(editor.getSnapshot()))

    window.addEventListener('scroll', updateRect, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', updateRect)

    return () => {
      window.removeEventListener('scroll', updateRect, {capture: true})
      window.removeEventListener('resize', updateRect)
    }
  }, [editor, expanded])

  if (!rect) {
    return null
  }

  return (
    <div
      role="toolbar"
      style={{position: 'fixed', top: rect.bottom + 4, left: rect.left}}
    >
      {toolbarSchema.decorators.map((decorator) => (
        <DecoratorButton key={decorator.name} schemaType={decorator} />
      ))}
    </div>
  )
}

function DecoratorButton(props: {schemaType: ToolbarDecoratorSchemaType}) {
  const button = useDecoratorButton(props)

  return (
    <button
      type="button"
      aria-pressed={button.snapshot.matches({enabled: 'active'})}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => button.send({type: 'toggle'})}
    >
      {props.schemaType.title ?? props.schemaType.name}
    </button>
  )
}
```

- `editor.dom.getSelectionRect(snapshot)` maps the editor's selection, not the DOM's. It returns `null` without a selection and a caret rect for a collapsed one.
- `useToolbarSchema` takes an argument. Call it as `useToolbarSchema({})` when you have no extensions.
- The toolbar hooks bring keyboard shortcuts, mutually exclusive decorators and the disabled state. `useAnnotationButton` assumes a dialog (`open dialog`, then `add`). For a one-click annotation, send `{type: 'add', annotation: {value}}` directly.
- Selectors re-run once per burst of editor changes, so they are live while typing. A selector that builds a new array or object needs a structural `compare` as the third argument, or the component re-renders on every change.
- A component outside `EditorProvider` gets the `Editor` as a prop. Lift it into state from a small child of the provider (`useEditor()` in an effect, then `setEditor`). A ref does not re-render the outside component when the editor appears.
- To jump the caret, build the point with `getBlockStartPoint`, send `select`, then send `focus`. `select` alone does not focus the editable.

## Value in and out

`initialConfig` is read once on mount, and changing it later does nothing. The editor owns the value. You talk to it with events.

| Situation                                                                    | Do this                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Persist the user's edits                                                     | `editor.on('mutation', (event) => save(event.patches, event.value))`. `mutation` is debounced and batched for persistence                                    |
| Stream every operation (a socket)                                            | `editor.on('patch', ...)`                                                                                                                                    |
| Apply another writer's changes while the user may be typing                  | `editor.send({type: 'patches', patches, snapshot})` with other writers' patches marked `origin: 'remote'`, where `snapshot` is the value after those patches |
| Switch to another document                                                   | Remount: `<EditorProvider key={documentId} initialConfig={{schemaDefinition, initialValue}}>`                                                                |
| A fresh snapshot of the same document arrives and nothing local is in flight | `editor.send({type: 'update value', value})`                                                                                                                 |

- `update value` replaces every block that differs from the editor's current content, local edits included. It is not a setter for live sync, and it does not clear undo history.
- Do not send the editor its own patches back. Every patch that is not `origin: 'local'` is applied, and an echo of an `insert` or `diffMatchPatch` applies twice. Have the channel skip the sender, or drop your own echoes before you mark the rest `'remote'`.
- Include `snapshot` with incoming patches. History uses it to keep local undo steps valid over remote edits, so undo removes only the user's own changes.
- Do not read live content from `mutation` for UI. It lags by design. Use `useEditorSelector`.

The full sync loop, the `update value` caveats and the document switch are in [references/value-sync.md](references/value-sync.md).

## Paste

Paste runs through Behaviors: `clipboard.paste`, then `deserialize`, then one `deserialize.data` per available format (Portable Text, JSON, Markdown, HTML, plain text, in that order). On `deserialization.success` the editor fits the blocks to the destination and inserts them. If a format fails, the next one available is tried.

- For "paste a URL on selected text makes a link", mount `PasteLinkPlugin` from `@portabletext/plugin-paste-link`. It also replaces an existing link and inserts a linked URL at a collapsed caret.
- To convert a format yourself, write a Behavior on `deserialize.data` that narrows on `event.mimeType` and on the situation, and raises `deserialization.success` with your blocks. The editor inserts them.
- The first Behavior whose guard matches a `deserialize.data` event owns that format. Keep guards narrow.
- Behaviors on `insert.text` or `insert.break` do not see a paste of blocks, which arrives as `insert.blocks`. To restrict what can be pasted, handle `deserialize.data` or `insert.blocks`.
- `onPaste` on `PortableTextEditable` runs before the pipeline, and `onCopy` or `onCut` replace the editor's copy entirely. Prefer Behaviors.

```tsx
import {defineBehavior, raise} from '@portabletext/editor/behaviors'
import {markdownToPortableText} from '@portabletext/markdown'

// Plain text that looks like Markdown pastes as formatted blocks.
const pasteMarkdownLikeText = defineBehavior({
  on: 'deserialize.data',
  guard: ({snapshot, event}) => {
    if (
      event.mimeType !== 'text/plain' ||
      !/^(#{1,6} |[-*] |> )/m.test(event.data)
    ) {
      return false
    }

    return {
      blocks: markdownToPortableText(event.data, {
        schema: snapshot.context.schema,
        keyGenerator: snapshot.context.keyGenerator,
      }),
    }
  },
  actions: [
    ({event}, {blocks}) => [
      raise({
        type: 'deserialization.success',
        mimeType: 'text/markdown',
        data: blocks,
        originEvent: event.originEvent,
      }),
    ],
  ],
})
```

## Rendering custom nodes

Define nodes with `defineContainer`, `defineBlockObject`, `defineInlineObject`, `defineTextBlock`, `defineDecorator` or `defineAnnotation`, and mount them with `NodePlugin`, keeping the array at module scope. A container needs `arrayField` naming the array of blocks in the schema, for example `defineContainer({type: 'callout', arrayField: 'content'})`. Render props type `node` with an index signature, so read custom fields as `props.node['field']` and narrow them.

## Testing

The editor's own `createTestEditor` lives under `@portabletext/editor/test/vitest`, which is not a public export. Write the small harness from [references/testing.md](references/testing.md): `EditorProvider` with `EditorRefPlugin` and `PortableTextEditable`, rendered in a Vitest browser test. Drive it with real `userEvent` typing, and assert on `editor.getSnapshot().context.value`.

## References

- [references/value-sync.md](references/value-sync.md): saving, remote patches, `update value`, switching documents.
- [references/inline-objects-and-pickers.md](references/inline-objects-and-pickers.md): inserting inline objects from rules and pickers with the caret after them.
- [references/testing.md](references/testing.md): the public test harness.

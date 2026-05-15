import {
  useEditor,
  useEditorSelector,
  type EditorSnapshot,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {
  useApplicableSchema,
  useDecoratorButton,
  useHistoryButtons,
  useStyleSelector,
  useToolbarSchema,
  type ToolbarDecoratorSchemaType,
  type ToolbarStyleSchemaType,
} from '@portabletext/toolbar'
import {useState} from 'react'
import {
  InsertDialog,
  insertDialogConfigs,
  type InsertDialogConfig,
} from './insert-dialog'
import {getEnclosingList} from './plugins/structured-lists'

function enclosingListsEqual(
  a: ReturnType<typeof getEnclosingList>,
  b: ReturnType<typeof getEnclosingList>,
) {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return (
    (a.list.node as {_key?: string})._key ===
      (b.list.node as {_key?: string})._key &&
    (a.list.node as {kind?: string}).kind ===
      (b.list.node as {kind?: string}).kind &&
    (a.listItem.node as {_key?: string})._key ===
      (b.listItem.node as {_key?: string})._key
  )
}

/**
 * Pilcrow toolbar. Style picker, decorator toggles, block-insert
 * buttons, list indent/outdent, history. Block insertion goes
 * through `insert.block`, list indent/outdent re-emits the same
 * `keyboard.keydown` event that the structured-lists plugin
 * listens for - keeps the indent/outdent path identical to Tab /
 * Shift+Tab.
 */
export function Toolbar() {
  const schema = useToolbarSchema({})
  const [dialogConfig, setDialogConfig] = useState<InsertDialogConfig | null>(
    null,
  )
  return (
    <>
      <div className="pc-toolbar" role="toolbar">
        <StyleSelector styles={schema.styles} />
        <span className="pc-toolbar-divider" aria-hidden />
        {schema.decorators.map((decorator) => (
          <DecoratorButton key={decorator.name} schemaType={decorator} />
        ))}
        <span className="pc-toolbar-divider" aria-hidden />
        <ListToggleButton kind="bullet" label="Bullet list" symbol="•" />
        <ListToggleButton kind="number" label="Numbered list" symbol="1." />
        <ListToggleButton kind="task" label="Task list" symbol="☐" />
        <span className="pc-toolbar-divider" aria-hidden />
        <InsertBlockButton
          type="image"
          label="Insert image"
          symbol="▣"
          onOpenDialog={setDialogConfig}
        />
        <InsertBlockButton
          type="code-block"
          label="Insert code block"
          symbol="{ }"
          onOpenDialog={setDialogConfig}
        />
        <InsertBlockButton
          type="callout"
          label="Insert callout"
          symbol="ℹ"
          onOpenDialog={setDialogConfig}
        />
        <InsertBlockButton
          type="table"
          label="Insert table"
          symbol="▦"
          onOpenDialog={setDialogConfig}
        />
        <InsertBlockButton
          type="horizontal-rule"
          label="Insert divider"
          symbol="―"
          onOpenDialog={setDialogConfig}
        />
        <span className="pc-toolbar-divider" aria-hidden />
        <ListIndentButtons />
        <span
          className="pc-toolbar-divider pc-toolbar-divider-grow"
          aria-hidden
        />
        <HistoryButtons />
      </div>
      {dialogConfig ? (
        <InsertDialog
          config={dialogConfig}
          onClose={() => setDialogConfig(null)}
        />
      ) : null}
    </>
  )
}

function StyleSelector(props: {styles: ReadonlyArray<ToolbarStyleSchemaType>}) {
  const styleSelector = useStyleSelector({schemaTypes: props.styles})
  const applicable = useApplicableSchema()
  const active = styleSelector.snapshot.context.activeStyle ?? 'normal'
  const disabled = styleSelector.snapshot.matches('disabled')
  if (props.styles.length === 0) {
    return null
  }
  return (
    <select
      className="pc-toolbar-select"
      value={active}
      disabled={disabled}
      onChange={(event) => {
        styleSelector.send({type: 'toggle', style: event.target.value})
      }}
    >
      {props.styles.map((style) => {
        const isApplicable = applicable.styles.has(style.name)
        return (
          <option key={style.name} value={style.name} disabled={!isApplicable}>
            {styleLabels[style.name] ?? style.title ?? style.name}
          </option>
        )
      })}
    </select>
  )
}

const styleLabels: Record<string, string> = {
  normal: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
}

function DecoratorButton(props: {schemaType: ToolbarDecoratorSchemaType}) {
  const decoratorButton = useDecoratorButton(props)
  const applicable = useApplicableSchema()
  const isActive =
    decoratorButton.snapshot.matches({disabled: 'active'}) ||
    decoratorButton.snapshot.matches({enabled: 'active'})
  const isDisabled =
    !applicable.decorators.has(props.schemaType.name) ||
    decoratorButton.snapshot.matches('disabled')
  const label =
    decoratorLabels[props.schemaType.name] ??
    props.schemaType.title ??
    props.schemaType.name
  const symbol =
    decoratorSymbols[props.schemaType.name] ?? label.charAt(0).toUpperCase()
  return (
    <button
      type="button"
      className={`pc-toolbar-button${isActive ? ' pc-toolbar-button-active' : ''}`}
      disabled={isDisabled}
      onClick={() => decoratorButton.send({type: 'toggle'})}
      title={label}
      aria-pressed={isActive}
      aria-label={label}
    >
      <span className={decoratorClasses[props.schemaType.name] ?? ''}>
        {symbol}
      </span>
    </button>
  )
}

const decoratorLabels: Record<string, string> = {
  'strong': 'Bold',
  'em': 'Italic',
  'code': 'Code',
  'strike-through': 'Strikethrough',
}

const decoratorSymbols: Record<string, string> = {
  'strong': 'B',
  'em': 'I',
  'code': '<>',
  'strike-through': 'S',
}

const decoratorClasses: Record<string, string> = {
  'strong': 'pc-toolbar-symbol-strong',
  'em': 'pc-toolbar-symbol-em',
  'code': 'pc-toolbar-symbol-code',
  'strike-through': 'pc-toolbar-symbol-strike',
}

function ListToggleButton(props: {
  kind: 'bullet' | 'number' | 'task'
  label: string
  symbol: string
}) {
  const editor = useEditor()
  const enclosing = useEditorSelector(
    editor,
    getEnclosingList,
    enclosingListsEqual,
  )
  const enclosingKind = (enclosing?.list.node as {kind?: string} | undefined)
    ?.kind
  const isActive = enclosingKind === props.kind
  return (
    <button
      type="button"
      className={`pc-toolbar-button${isActive ? ' pc-toolbar-button-active' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        if (enclosing && enclosingKind === props.kind) {
          // Same kind: unwrap the focused list-item's content out of the list.
          editor.send({
            type: 'custom.structured-lists.unwrap',
          } as never)
          return
        }
        if (enclosing) {
          // Different kind: change the enclosing list's kind in place.
          // Use the `set` primitive with the full property path because
          // `block.set` filters by `getBlockObjectSchema`, which doesn't
          // resolve container types (the `list` is a container, not a
          // root-level block-object), so it would silently drop `kind`.
          editor.send({
            type: 'set',
            at: [...enclosing.list.path, 'kind'],
            value: props.kind,
          } as never)
          return
        }
        // Not in a list: wrap the focus block in a fresh list of this kind.
        editor.send({
          type: 'custom.structured-lists.wrap',
          kind: props.kind,
        } as never)
      }}
      title={props.label}
      aria-label={props.label}
      aria-pressed={isActive}
    >
      <span aria-hidden>{props.symbol}</span>
    </button>
  )
}

function InsertBlockButton(props: {
  type: string
  label: string
  symbol: string
  onOpenDialog: (config: InsertDialogConfig) => void
}) {
  const editor = useEditor()
  return (
    <button
      type="button"
      className="pc-toolbar-button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        const config = insertDialogConfigs[props.type]
        if (config) {
          props.onOpenDialog(config)
          return
        }
        // No field config - just insert the block directly.
        editor.send({
          type: 'insert.block',
          block: {_type: props.type},
          placement: 'auto',
        })
      }}
      title={props.label}
      aria-label={props.label}
    >
      <span aria-hidden>{props.symbol}</span>
    </button>
  )
}

function isFocusInList(snapshot: EditorSnapshot) {
  const focusBlock = selectors.getFocusBlock(snapshot)
  if (!focusBlock) {
    return false
  }
  // A structured-list path includes an 'items' segment somewhere.
  return focusBlock.path.some((segment) => segment === 'items')
}

function ListIndentButtons() {
  const editor = useEditor()
  const inList = useEditorSelector(editor, isFocusInList)
  return (
    <>
      <button
        type="button"
        className="pc-toolbar-button"
        disabled={!inList}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.send({type: 'custom.structured-lists.outdent'})
        }}
        title="Outdent list item"
        aria-label="Outdent list item"
      >
        <span aria-hidden>⇤</span>
      </button>
      <button
        type="button"
        className="pc-toolbar-button"
        disabled={!inList}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.send({type: 'custom.structured-lists.indent'})
        }}
        title="Indent list item"
        aria-label="Indent list item"
      >
        <span aria-hidden>⇥</span>
      </button>
    </>
  )
}

function HistoryButtons() {
  const {snapshot, send} = useHistoryButtons()
  const disabled = snapshot.matches('disabled')
  return (
    <>
      <button
        type="button"
        className="pc-toolbar-button"
        onClick={() => send({type: 'history.undo'})}
        disabled={disabled}
        title="Undo"
        aria-label="Undo"
      >
        <span aria-hidden>↩</span>
      </button>
      <button
        type="button"
        className="pc-toolbar-button"
        onClick={() => send({type: 'history.redo'})}
        disabled={disabled}
        title="Redo"
        aria-label="Redo"
      >
        <span aria-hidden>↪</span>
      </button>
    </>
  )
}

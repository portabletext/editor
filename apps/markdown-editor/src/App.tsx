import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  useEditor,
  useEditorSelector,
  type BlockListItemRenderProps,
  type RenderBlockFunction,
  type RenderDecoratorFunction,
  type RenderListItemFunction,
  type RenderStyleFunction,
} from '@portabletext/editor'
import * as selectors from '@portabletext/editor/selectors'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {MarkdownShortcutsPlugin} from '@portabletext/plugin-markdown-shortcuts'
import './App.css'
import {MarkdownEditorBehaviorsPlugin} from './markdown-editor-behaviors'
import {createTaskListRule} from './rules/task-list'

export const schemaDefinition = defineSchema({
  block: {
    fields: [{name: 'checked', type: 'boolean'}],
  },
  decorators: [
    {name: 'strong'},
    {name: 'em'},
    {name: 'underline'},
    {name: 'code'},
  ],
  styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'h3'}],
  lists: [{name: 'bullet'}, {name: 'number'}, {name: 'task'}],
})

const renderDecorator: RenderDecoratorFunction = (props) => {
  if (props.value === 'strong') return <strong>{props.children}</strong>
  if (props.value === 'em') return <em>{props.children}</em>
  if (props.value === 'underline') return <u>{props.children}</u>
  if (props.value === 'code') return <code>{props.children}</code>
  return <>{props.children}</>
}

const renderStyle: RenderStyleFunction = (props) => {
  if (props.schemaType.value === 'h1') return <h1>{props.children}</h1>
  if (props.schemaType.value === 'h2') return <h2>{props.children}</h2>
  if (props.schemaType.value === 'h3') return <h3>{props.children}</h3>
  return <>{props.children}</>
}

const renderBlock: RenderBlockFunction = (props) => {
  return <div className="block">{props.children}</div>
}

const renderListItem: RenderListItemFunction = (props) => {
  if (props.value === 'task') {
    return <TaskListItem {...props} />
  }
  return <>{props.children}</>
}

function TaskListItem(props: BlockListItemRenderProps) {
  const editor = useEditor()
  const checked = (props.block as {checked?: boolean}).checked === true

  return (
    <span className="task-row" data-checked={checked}>
      <button
        aria-label={checked ? 'Mark task incomplete' : 'Mark task complete'}
        aria-pressed={checked}
        className="task-checkbox"
        contentEditable={false}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.send({
            type: 'block.set',
            at: props.path,
            props: {checked: !checked},
          })
          editor.send({type: 'focus'})
        }}
      />
      <span className="task-content">{props.children}</span>
    </span>
  )
}

function App() {
  return (
    <main className="shell">
      <section className="workspace" aria-label="Markdown editor">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portable Text prototype</p>
            <h1>Markdown-first editor</h1>
          </div>
        </header>

        <EditorProvider initialConfig={{schemaDefinition}}>
          <MarkdownEditorBehaviorsPlugin />
          <MarkdownShortcutsPlugin
            headingStyle={({context, props}) =>
              context.schema.styles.find((s) => s.name === `h${props.level}`)
                ?.name
            }
            unorderedList={({context}) =>
              context.schema.lists.find((l) => l.name === 'bullet')?.name
            }
            orderedList={({context}) =>
              context.schema.lists.find((l) => l.name === 'number')?.name
            }
            boldDecorator={({context}) =>
              context.schema.decorators.find((d) => d.name === 'strong')?.name
            }
            italicDecorator={({context}) =>
              context.schema.decorators.find((d) => d.name === 'em')?.name
            }
            codeDecorator={({context}) =>
              context.schema.decorators.find((d) => d.name === 'code')?.name
            }
          />
          <InputRulePlugin
            rules={[
              createTaskListRule({
                taskList: ({context}) =>
                  context.schema.lists.find((l) => l.name === 'task')?.name,
              }),
            ]}
          />
          <Toolbar />
          <div className="editor-frame">
            <PortableTextEditable
              className="editor"
              placeholder="Write Markdown..."
              renderDecorator={renderDecorator}
              renderStyle={renderStyle}
              renderBlock={renderBlock}
              renderListItem={renderListItem}
            />
          </div>
          <StatusBar />
        </EditorProvider>
      </section>
    </main>
  )
}

function Toolbar() {
  return (
    <div className="toolbar" aria-label="Formatting toolbar">
      <StyleButton style="normal" label="P" title="Paragraph" />
      <StyleButton style="h1" label="H1" title="Heading 1" />
      <StyleButton style="h2" label="H2" title="Heading 2" />
      <StyleButton style="h3" label="H3" title="Heading 3" />
      <ListButton list="bullet" label="Bullet" title="Bulleted list" />
      <ListButton list="number" label="Numbered" title="Numbered list" />
      <ListButton list="task" label="Task" title="Task list" />
      <span className="toolbar-divider" />
      <DecoratorButton decorator="strong" label="B" title="Bold" />
      <DecoratorButton decorator="em" label="I" title="Italic" />
      <DecoratorButton decorator="underline" label="U" title="Underline" />
      <DecoratorButton decorator="code" label="Code" title="Inline code" />
    </div>
  )
}

function StyleButton(props: {style: string; label: string; title: string}) {
  const editor = useEditor()
  const active = useEditorSelector(editor, selectors.isActiveStyle(props.style))
  return (
    <button
      aria-pressed={active}
      className="toolbar-button"
      title={props.title}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        editor.send({type: 'style.toggle', style: props.style})
        editor.send({type: 'focus'})
      }}
    >
      {props.label}
    </button>
  )
}

function ListButton(props: {list: string; label: string; title: string}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveListItem(props.list),
  )
  return (
    <button
      aria-pressed={active}
      className="toolbar-button"
      title={props.title}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        editor.send({type: 'list item.toggle', listItem: props.list})
        editor.send({type: 'focus'})
      }}
    >
      {props.label}
    </button>
  )
}

function DecoratorButton(props: {
  decorator: string
  label: string
  title: string
}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.decorator),
  )
  return (
    <button
      aria-pressed={active}
      className="toolbar-button"
      title={props.title}
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        editor.send({type: 'decorator.toggle', decorator: props.decorator})
        editor.send({type: 'focus'})
      }}
    >
      {props.label}
    </button>
  )
}

function StatusBar() {
  return (
    <div className="statusbar">
      <span>Hotkeys: Cmd/Ctrl+B, I, U, ' for bold/italic/underline/code</span>
      <span className="active-marks">
        {schemaDefinition.decorators.map((decorator) => (
          <ActiveMarkLabel key={decorator.name} decorator={decorator.name} />
        ))}
      </span>
    </div>
  )
}

function ActiveMarkLabel(props: {decorator: string}) {
  const editor = useEditor()
  const active = useEditorSelector(
    editor,
    selectors.isActiveDecorator(props.decorator),
  )
  if (!active) return null
  return <span className="active-mark">{props.decorator}</span>
}

export default App

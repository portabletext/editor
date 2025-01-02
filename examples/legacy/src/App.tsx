import {
  MutationChange,
  Patch,
  PortableTextBlock,
  PortableTextChild,
  PortableTextEditable,
  PortableTextEditor,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderStyleFunction,
  usePortableTextEditor,
  usePortableTextEditorSelection,
} from '@portabletext/editor'
import {applyAll} from '@portabletext/patches'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect, useMemo} from 'react'
import {Subject} from 'rxjs'
import {ActorRefFrom, assign, emit, sendParent, setup} from 'xstate'
import './editor.css'
import {schema} from './schema'

const editorMachine = setup({
  types: {
    events: {} as
      | MutationChange
      | {
          type: 'patches'
          patches: MutationChange['patches']
          snapshot: MutationChange['snapshot']
        },
    emitted: {} as {
      type: 'patches'
      patches: MutationChange['patches']
      snapshot: MutationChange['snapshot']
    },
  },
}).createMachine({
  id: 'editor',
  on: {
    mutation: {
      actions: sendParent(({event, self}) => ({
        ...event,
        type: 'editor.mutation',
        editorId: self.id,
      })),
    },
    patches: {
      actions: emit(({event}) => event),
    },
  },
})

const playgroundMachine = setup({
  types: {
    context: {} as {
      editors: Array<ActorRefFrom<typeof editorMachine>>
      value: Array<PortableTextBlock> | undefined
    },
    events: {} as {
      type: 'editor.mutation'
      editorId: ActorRefFrom<typeof editorMachine>['id']
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    },
  },
  actors: {
    'editor machine': editorMachine,
  },
}).createMachine({
  id: 'playground',
  context: ({spawn}) => ({
    editors: [spawn(editorMachine), spawn(editorMachine)],
    value: undefined,
  }),
  on: {
    'editor.mutation': {
      actions: [
        ({context, event}) => {
          for (const editor of context.editors) {
            editor.send({
              type: 'patches',
              patches: event.patches.map((patch) => ({
                ...patch,
                origin: event.editorId === editor.id ? 'local' : 'remote',
              })),
              snapshot: event.snapshot,
            })
          }
        },
        assign({
          value: ({context, event}) => {
            return applyAll(context.value, event.patches)
          },
        }),
      ],
    },
  },
})

/**
 * WARNING: This is just an example app to make sure that legacy APIs are still
 * working. Don't use this as a reference for your own project.
 */
function App() {
  const playground = useActorRef(playgroundMachine)
  const editors = useSelector(playground, (s) => s.context.editors)
  const value = useSelector(playground, (s) => s.context.value)

  return (
    <>
      {editors.map((editor) => (
        <Editor key={editor.id} editorRef={editor} value={value} />
      ))}
      <pre style={{border: '1px dashed black', padding: '0.5em'}}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </>
  )
}

function Editor(props: {
  editorRef: ActorRefFrom<typeof editorMachine>
  value: Array<PortableTextBlock> | undefined
}) {
  const patches$ = useMemo(
    () =>
      new Subject<{
        patches: Patch[]
        snapshot: PortableTextBlock[] | undefined
      }>(),
    [],
  )
  useEffect(() => {
    props.editorRef.on('patches', (event) => {
      patches$.next({
        patches: event.patches,
        snapshot: event.snapshot,
      })
    })
  }, [props.editorRef, patches$])

  return (
    <div style={{border: '1px solid black', padding: '0.5em'}}>
      <PortableTextEditor
        patches$={patches$}
        schemaType={schema}
        value={props.value}
        onChange={(change) => {
          if (change.type === 'mutation') {
            props.editorRef.send(change)
          }
        }}
      >
        <Toolbar />
        <PortableTextEditable
          hotkeys={{
            custom: {
              'mod+k': (_, editor) => {
                /**
                 * In a real-world scenario you would want to trigger a dialog
                 * here so you can ask the user to input the URL for the link.
                 */
                if (PortableTextEditor.isAnnotationActive(editor, 'link')) {
                  PortableTextEditor.removeAnnotation(editor, {name: 'link'})
                } else {
                  PortableTextEditor.addAnnotation(
                    editor,
                    {name: 'link'},
                    {href: 'https://example.com'},
                  )
                }
              },
            },
          }}
          style={{border: '1px solid black', padding: '0.5em'}}
          renderDecorator={renderDecorator}
          renderAnnotation={renderAnnotation}
          renderBlock={renderBlock}
          renderStyle={renderStyle}
          renderChild={renderChild}
          renderListItem={(props) => <>{props.children}</>}
        />
      </PortableTextEditor>
    </div>
  )
}

const renderDecorator: RenderDecoratorFunction = (props) => {
  if (props.value === 'strong') {
    return <strong>{props.children}</strong>
  }
  if (props.value === 'em') {
    return <em>{props.children}</em>
  }
  if (props.value === 'underline') {
    return <u>{props.children}</u>
  }
  return <>{props.children}</>
}

const renderAnnotation: RenderAnnotationFunction = (props) => {
  if (props.schemaType.name === 'link') {
    return <span style={{textDecoration: 'underline'}}>{props.children}</span>
  }

  return <>{props.children}</>
}

const renderBlock: RenderBlockFunction = (props) => {
  if (props.schemaType.name === 'image' && isImage(props.value)) {
    return (
      <div
        style={{
          border: '1px dotted grey',
          padding: '0.25em',
          marginBlockEnd: '0.25em',
        }}
      >
        IMG: {props.value.src}
      </div>
    )
  }

  return <div style={{marginBlockEnd: '0.25em'}}>{props.children}</div>
}

function isImage(
  props: PortableTextBlock,
): props is PortableTextBlock & {src: string} {
  return 'src' in props
}

const renderStyle: RenderStyleFunction = (props) => {
  if (props.schemaType.value === 'h1') {
    return <h1>{props.children}</h1>
  }
  if (props.schemaType.value === 'h2') {
    return <h2>{props.children}</h2>
  }
  if (props.schemaType.value === 'h3') {
    return <h3>{props.children}</h3>
  }
  if (props.schemaType.value === 'blockquote') {
    return <blockquote>{props.children}</blockquote>
  }
  return <>{props.children}</>
}

const renderChild: RenderChildFunction = (props) => {
  if (props.schemaType.name === 'stock-ticker' && isStockTicker(props.value)) {
    return (
      <span
        style={{
          border: '1px dotted grey',
          padding: '0.15em',
        }}
      >
        {props.value.symbol}
      </span>
    )
  }

  return <>{props.children}</>
}

function isStockTicker(
  props: PortableTextChild,
): props is PortableTextChild & {symbol: string} {
  return 'symbol' in props
}

function Toolbar() {
  const editor = usePortableTextEditor()
  usePortableTextEditorSelection()

  const decoratorButtons = editor.schemaTypes.decorators.map((decorator) => (
    <DecoratorButton key={decorator.value} decorator={decorator.value} />
  ))

  const linkButton = (
    <button
      style={{
        textDecoration: PortableTextEditor.isAnnotationActive(
          editor,
          editor.schemaTypes.annotations[0].name,
        )
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        if (
          PortableTextEditor.isAnnotationActive(
            editor,
            editor.schemaTypes.annotations[0].name,
          )
        ) {
          PortableTextEditor.removeAnnotation(
            editor,
            editor.schemaTypes.annotations[0],
          )
        } else {
          PortableTextEditor.addAnnotation(
            editor,
            editor.schemaTypes.annotations[0],
            {href: 'https://example.com'},
          )
        }
        PortableTextEditor.focus(editor)
      }}
    >
      link
    </button>
  )

  const styleButtons = editor.schemaTypes.styles.map((style) => (
    <button
      key={style.value}
      style={{
        textDecoration: PortableTextEditor.hasBlockStyle(editor, style.value)
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleBlockStyle(editor, style.value)
        PortableTextEditor.focus(editor)
      }}
    >
      {style.value}
    </button>
  ))

  const listButtons = editor.schemaTypes.lists.map((list) => (
    <button
      key={list.value}
      style={{
        textDecoration: PortableTextEditor.hasListStyle(editor, list.value)
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleList(editor, list.value)
        PortableTextEditor.focus(editor)
      }}
    >
      {list.value}
    </button>
  ))

  const imageButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertBlock(
          editor,
          editor.schemaTypes.blockObjects[0],
          {src: 'https://example.com/image.jpg'},
        )
        PortableTextEditor.focus(editor)
      }}
    >
      {editor.schemaTypes.blockObjects[0].name}
    </button>
  )

  const stockTickerButton = (
    <button
      onClick={() => {
        PortableTextEditor.insertChild(
          editor,
          editor.schemaTypes.inlineObjects[0],
          {symbol: 'AAPL'},
        )
        PortableTextEditor.focus(editor)
      }}
    >
      {editor.schemaTypes.inlineObjects[0].name}
    </button>
  )

  return (
    <>
      <div>{decoratorButtons}</div>
      <div>{linkButton}</div>
      <div>{styleButtons}</div>
      <div>{listButtons}</div>
      <div>{imageButton}</div>
      <div>{stockTickerButton}</div>
    </>
  )
}

function DecoratorButton(props: {decorator: string}) {
  const editor = usePortableTextEditor()
  usePortableTextEditorSelection()

  return (
    <button
      key={props.decorator}
      style={{
        textDecoration: PortableTextEditor.isMarkActive(editor, props.decorator)
          ? 'underline'
          : 'unset',
      }}
      onClick={() => {
        PortableTextEditor.toggleMark(editor, props.decorator)
        PortableTextEditor.focus(editor)
      }}
    >
      {props.decorator}
    </button>
  )
}

export default App

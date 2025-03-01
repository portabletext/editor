import type {PortableTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import * as React from 'react'
import {useEffect} from 'react'
import {
  PortableTextEditable,
  useEditorSelector,
  type HotkeyOptions,
  type PortableTextEditor,
  type RangeDecoration,
} from '../src'
import type {Behavior} from '../src/behaviors'
import type {EditorEmittedEvent} from '../src/editor/editor-machine'
import {EditorProvider, useEditor} from '../src/editor/editor-provider'
import {EditorRefPlugin} from '../src/plugins'
import * as selectors from '../src/selectors'
import type {EditorActorRef, TestActorRef} from './test-machine'

export function Editors(props: {testRef: TestActorRef}) {
  const editorActorRefs = useSelector(
    props.testRef,
    (state) => state.context.editors,
  )
  const behaviors = useSelector(
    props.testRef,
    (state) => state.context.behaviors,
  )
  const schema = useSelector(props.testRef, (state) => state.context.schema)
  const rangeDecorations = useSelector(
    props.testRef,
    (state) => state.context.rangeDecorations,
  )
  const value = useSelector(props.testRef, (state) => state.context.value)

  return (
    <div>
      {editorActorRefs.map((editorActorRef) => (
        <Editor
          behaviors={behaviors}
          key={editorActorRef.id}
          editorActorRef={editorActorRef}
          rangeDecorations={rangeDecorations}
          schema={schema}
          value={value}
        />
      ))}
      <pre data-testid="value">{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

const hotkeys: HotkeyOptions = {
  marks: {
    'mod+b': 'strong',
    'mod+i': 'em',
  },
}

function Editor(props: {
  editorActorRef: EditorActorRef
  behaviors: Array<Behavior>
  rangeDecorations?: Array<RangeDecoration>
  schema: React.ComponentProps<typeof PortableTextEditor>['schemaType']
  value: Array<PortableTextBlock> | undefined
}) {
  const editorRef = useSelector(
    props.editorActorRef,
    (state) => state.context.editorRef,
  )
  const selection = useSelector(
    props.editorActorRef,
    (state) => state.context.selection,
  )
  const [selectionValue, setSelectionValue] = React.useState(() => selection)
  const keyGenerator = useSelector(
    props.editorActorRef,
    (state) => state.context.keyGenerator,
  )

  return (
    <div data-testid={props.editorActorRef.id}>
      <EditorProvider
        initialConfig={{
          behaviors: props.behaviors,
          keyGenerator,
          schema: props.schema,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <EditorEventListener
          editorActorRef={props.editorActorRef}
          behaviors={props.behaviors}
          value={props.value}
          on={(event) => {
            if (event.type === 'mutation') {
              props.editorActorRef.send(event)
            }
            if (event.type === 'selection') {
              setSelectionValue(event.selection)
            }
          }}
        />
        <FocusListener editorActorRef={props.editorActorRef} />
        <BlockButtons />
        <InlineObjectButtons />
        <CommentButtons />
        <LinkButtons />
        <StyleButtons />
        <PortableTextEditable
          rangeDecorations={props.rangeDecorations}
          hotkeys={hotkeys}
          selection={selection}
        />
      </EditorProvider>
      <pre data-testid="selection">
        {JSON.stringify(selectionValue ?? null, null, 2)}
      </pre>
    </div>
  )
}

function EditorEventListener(props: {
  behaviors: Array<Behavior>
  editorActorRef: EditorActorRef
  on: (event: EditorEmittedEvent) => void
  value: Array<PortableTextBlock> | undefined
}) {
  const editor = useEditor()

  useEffect(() => {
    editor.send({
      type: 'update behaviors',
      behaviors: props.behaviors,
    })
  }, [editor, props.behaviors])

  useEffect(() => {
    editor.send({
      type: 'update value',
      value: props.value,
    })
  }, [editor, props.value])

  useEffect(() => {
    const subscription = props.editorActorRef.on('patches', (event) => {
      editor.send(event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorActorRef, editor])

  useEffect(() => {
    const subscription = editor.on('*', props.on)

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorActorRef, editor, props.on])

  return null
}

function FocusListener(props: {editorActorRef: EditorActorRef}) {
  const editor = useEditor()

  useEffect(() => {
    const subscription = props.editorActorRef.on('focus', () => {
      editor.send({type: 'focus'})
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.editorActorRef])

  return null
}

function BlockButtons() {
  const editor = useEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-image"
        onClick={() => {
          editor.send({
            type: 'insert.block object',
            blockObject: {
              name: 'image',
              value: {url: 'http://example.com/image.png'},
            },
            placement: 'auto',
          })
          editor.send({type: 'focus'})
        }}
      >
        Insert image
      </button>
    </>
  )
}

function InlineObjectButtons() {
  const editor = useEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-stock-ticker"
        onClick={() => {
          editor.send({
            type: 'insert.inline object',
            inlineObject: {
              name: 'stock-ticker',
              value: {symbol: 'NVDA'},
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        Insert stock ticker
      </button>
    </>
  )
}

function CommentButtons() {
  const editor = useEditor()
  const isActive = useEditorSelector(
    editor,
    selectors.isActiveAnnotation('comment'),
  )

  return (
    <>
      <button
        type="button"
        data-testid="button-add-comment"
        onClick={() => {
          editor.send({
            type: 'annotation.add',
            annotation: {
              name: 'comment',
              value: {text: 'Consider rewriting this'},
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        Add comment
      </button>
      <button
        type="button"
        data-testid="button-remove-comment"
        onClick={() => {
          editor.send({
            type: 'annotation.remove',
            annotation: {
              name: 'comment',
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        Remove comment
      </button>
      <button
        type="button"
        data-testid="button-toggle-comment"
        onClick={() => {
          if (isActive) {
            editor.send({
              type: 'annotation.remove',
              annotation: {
                name: 'comment',
              },
            })
          } else {
            editor.send({
              type: 'annotation.add',
              annotation: {
                name: 'comment',
                value: {text: 'Consider rewriting this'},
              },
            })
          }
          editor.send({type: 'focus'})
        }}
      >
        Toggle comment
      </button>
    </>
  )
}

function LinkButtons() {
  const editor = useEditor()
  const isActive = useEditorSelector(
    editor,
    selectors.isActiveAnnotation('link'),
  )

  return (
    <>
      <button
        type="button"
        data-testid="button-add-link"
        onClick={() => {
          editor.send({
            type: 'annotation.add',
            annotation: {
              name: 'link',
              value: {href: 'https://example.com'},
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        Add link
      </button>
      <button
        type="button"
        data-testid="button-remove-link"
        onClick={() => {
          editor.send({
            type: 'annotation.remove',
            annotation: {
              name: 'link',
            },
          })
          editor.send({type: 'focus'})
        }}
      >
        Remove link
      </button>
      <button
        type="button"
        data-testid="button-toggle-link"
        onClick={() => {
          if (isActive) {
            editor.send({
              type: 'annotation.remove',
              annotation: {
                name: 'link',
              },
            })
          } else {
            editor.send({
              type: 'annotation.add',
              annotation: {
                name: 'link',
                value: {href: 'https://example.com'},
              },
            })
          }
          editor.send({type: 'focus'})
        }}
      >
        Toggle link
      </button>
    </>
  )
}

function StyleButtons() {
  const editor = useEditor()
  const styles = useEditorSelector(editor, (s) => s.context.schema.styles)

  return (
    <>
      {styles.map((style) => (
        <button
          key={style.value}
          data-testid={`button-toggle-style-${style.value}`}
          type="button"
          onClick={() => {
            editor.send({
              type: 'style.toggle',
              style: style.value,
            })
            editor.send({type: 'focus'})
          }}
        >
          {style.title}
        </button>
      ))}
    </>
  )
}

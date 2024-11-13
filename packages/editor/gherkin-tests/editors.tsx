import type {PortableTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import * as React from 'react'
import {useEffect} from 'react'
import {
  PortableTextEditable,
  PortableTextEditor,
  useEditor,
  usePortableTextEditor,
  type Behavior,
  type HotkeyOptions,
  type PortableTextEditorInstance,
} from '../src'
import type {EditorActorRef, TestActorRef} from './test-machine'

export function Editors(props: {testRef: TestActorRef}) {
  const editors = useSelector(props.testRef, (state) => state.context.editors)
  const behaviors = useSelector(
    props.testRef,
    (state) => state.context.behaviors,
  )
  const schema = useSelector(props.testRef, (state) => state.context.schema)
  const value = useSelector(props.testRef, (state) => state.context.value)

  return (
    <div>
      {editors.map((editor) => (
        <Editor
          behaviors={behaviors}
          key={editor.id}
          editorRef={editor}
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
  editorRef: EditorActorRef
  behaviors: Array<Behavior>
  schema: React.ComponentProps<typeof PortableTextEditor>['schemaType']
  value: Array<PortableTextBlock> | undefined
}) {
  const selection = useSelector(
    props.editorRef,
    (state) => state.context.selection,
  )
  const [selectionValue, setSelectionValue] = React.useState(() => selection)
  const keyGenerator = useSelector(
    props.editorRef,
    (state) => state.context.keyGenerator,
  )
  const editor = useEditor({
    behaviors: props.behaviors,
    keyGenerator,
    schema: props.schema,
  })

  useEffect(() => {
    editor.send({
      type: 'update behaviors',
      behaviors: props.behaviors,
    })
  }, [editor, props.behaviors])

  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      editor.send(event)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorRef, editor])

  useEffect(() => {
    const subscription = editor.on('*', (event) => {
      if (event.type === 'mutation') {
        props.editorRef.send(event)
      }
      if (event.type === 'selection') {
        setSelectionValue(event.selection)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [props.editorRef, editor])

  return (
    <div data-testid={props.editorRef.id}>
      <PortableTextEditor editor={editor} value={props.value}>
        <FocusListener editorRef={props.editorRef} />
        <BlockButtons />
        <InlineObjectButtons />
        <CommentButtons />
        <LinkButtons />
        <StyleButtons />
        <PortableTextEditable hotkeys={hotkeys} selection={selection} />
      </PortableTextEditor>
      <pre data-testid="selection">
        {JSON.stringify(selectionValue ?? null, null, 2)}
      </pre>
    </div>
  )
}

function FocusListener(props: {editorRef: EditorActorRef}) {
  const editor = usePortableTextEditor()

  useEffect(() => {
    const subscription = props.editorRef.on('focus', () => {
      PortableTextEditor.focus(editor)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.editorRef])

  return null
}

function BlockButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-image"
        onClick={() => {
          PortableTextEditor.insertBlock(
            editor,
            {
              jsonType: 'object',
              name: 'image',
              fields: [],
              __experimental_search: [],
            },
            {url: 'http://example.com/image.png'},
          )
          PortableTextEditor.focus(editor)
        }}
      >
        Insert image
      </button>
    </>
  )
}

function InlineObjectButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-insert-stock-ticker"
        onClick={() => {
          PortableTextEditor.insertChild(
            editor,
            {
              jsonType: 'object',
              name: 'stock-ticker',
              fields: [],
              __experimental_search: [],
            },
            {symbol: 'NVDA'},
          )
          PortableTextEditor.focus(editor)
        }}
      >
        Insert stock ticker
      </button>
    </>
  )
}

function CommentButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-add-comment"
        onClick={() => {
          addComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Add comment
      </button>
      <button
        type="button"
        data-testid="button-remove-comment"
        onClick={() => {
          removeComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Remove comment
      </button>
      <button
        type="button"
        data-testid="button-toggle-comment"
        onClick={() => {
          toggleComment(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Toggle comment
      </button>
    </>
  )
}

function LinkButtons() {
  const editor = usePortableTextEditor()

  return (
    <>
      <button
        type="button"
        data-testid="button-add-link"
        onClick={() => {
          addLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Add link
      </button>
      <button
        type="button"
        data-testid="button-remove-link"
        onClick={() => {
          removeLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Remove link
      </button>
      <button
        type="button"
        data-testid="button-toggle-link"
        onClick={() => {
          toggleLink(editor)
          PortableTextEditor.focus(editor)
        }}
      >
        Toggle link
      </button>
    </>
  )
}

function toggleComment(editor: PortableTextEditorInstance) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'comment')

  if (active) {
    removeComment(editor)
  } else {
    addComment(editor)
  }
}

function addComment(editor: PortableTextEditorInstance) {
  PortableTextEditor.addAnnotation(
    editor,
    {
      jsonType: 'object',
      name: 'comment',
      fields: [],
      __experimental_search: [],
    },
    {text: 'Consider rewriting this'},
  )
}

function removeComment(editor: PortableTextEditorInstance) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'comment',
    fields: [],
    __experimental_search: [],
  })
}

function toggleLink(editor: PortableTextEditorInstance) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'link')

  if (active) {
    removeLink(editor)
  } else {
    addLink(editor)
  }
}

function addLink(editor: PortableTextEditorInstance) {
  PortableTextEditor.addAnnotation(
    editor,
    {
      jsonType: 'object',
      name: 'link',
      fields: [],
      __experimental_search: [],
    },
    {href: 'https://example.com'},
  )
}

function removeLink(editor: PortableTextEditorInstance) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'link',
    fields: [],
    __experimental_search: [],
  })
}

function StyleButtons() {
  const editor = usePortableTextEditor()
  const styles = editor.schemaTypes.styles

  return (
    <>
      {styles.map((style) => (
        <button
          key={style.value}
          data-testid={`button-toggle-style-${style.value}`}
          type="button"
          onClick={() => {
            PortableTextEditor.toggleBlockStyle(editor, style.value)
            PortableTextEditor.focus(editor)
          }}
        >
          {style.title}
        </button>
      ))}
    </>
  )
}

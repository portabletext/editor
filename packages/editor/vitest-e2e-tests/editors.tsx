import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@sanity/types'
import {useSelector} from '@xstate/react'
import * as React from 'react'
import {useEffect, useMemo} from 'react'
import {Subject} from 'rxjs'
import {
  PortableTextEditable,
  PortableTextEditor,
  usePortableTextEditor,
  type HotkeyOptions,
} from '../src'
import type {EditorActorRef, TestActorRef} from './test-machine'

export function Editors(props: {testRef: TestActorRef}) {
  const editors = useSelector(props.testRef, (state) => state.context.editors)
  const schema = useSelector(props.testRef, (state) => state.context.schema)
  const value = useSelector(props.testRef, (state) => state.context.value)

  return (
    <div>
      {editors.map((editor) => (
        <Editor
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
  const patches$ = useMemo(
    () =>
      new Subject<{
        patches: Array<Patch>
        snapshot: Array<PortableTextBlock> | undefined
      }>(),
    [],
  )

  useEffect(() => {
    const subscription = props.editorRef.on('patches', (event) => {
      patches$.next({
        patches: event.patches,
        snapshot: event.snapshot,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [patches$, props.editorRef])

  return (
    <div data-testid={props.editorRef.id}>
      <PortableTextEditor
        schemaType={props.schema}
        keyGenerator={keyGenerator}
        patches$={patches$}
        value={props.value}
        onChange={(change) => {
          if (change.type === 'mutation') {
            props.editorRef.send(change)
          }
          if (change.type === 'selection') {
            setSelectionValue(change.selection)
          }
        }}
      >
        <BlockButtons />
        <InlineObjectButtons />
        <CommentButtons />
        <LinkButtons />
        <PortableTextEditable hotkeys={hotkeys} selection={selection} />
      </PortableTextEditor>
      <pre data-testid="selection">
        {JSON.stringify(selectionValue ?? null, null, 2)}
      </pre>
    </div>
  )
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

function toggleComment(editor: PortableTextEditor) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'comment')

  if (active) {
    removeComment(editor)
  } else {
    addComment(editor)
  }
}

function addComment(editor: PortableTextEditor) {
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

function removeComment(editor: PortableTextEditor) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'comment',
    fields: [],
    __experimental_search: [],
  })
}

function toggleLink(editor: PortableTextEditor) {
  const active = PortableTextEditor.isAnnotationActive(editor, 'link')

  if (active) {
    removeLink(editor)
  } else {
    addLink(editor)
  }
}

function addLink(editor: PortableTextEditor) {
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

function removeLink(editor: PortableTextEditor) {
  PortableTextEditor.removeAnnotation(editor, {
    jsonType: 'object',
    name: 'link',
    fields: [],
    __experimental_search: [],
  })
}

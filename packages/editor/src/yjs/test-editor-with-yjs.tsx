import {defineSchema, type SchemaDefinition} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React, {useRef} from 'react'
import {expect, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import * as Y from 'yjs'
import type {Editor} from '../editor'
import type {InternalEditor} from '../editor/create-editor'
import {
  PortableTextEditable,
  type PortableTextEditableProps,
} from '../editor/Editable'
import {EditorProvider} from '../editor/editor-provider'
import {EditorRefPlugin} from '../plugins/plugin.editor-ref'
import type {Context} from '../test/vitest/step-context'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {YjsEditor} from './types'
import {withYjs} from './with-yjs'

type Options = {
  schemaDefinition?: SchemaDefinition
  editableProps?: PortableTextEditableProps
}

function YjsPlugin({
  sharedRoot,
  onSlateEditor,
}: {
  sharedRoot: Y.XmlText
  onSlateEditor: (editor: PortableTextSlateEditor) => void
}) {
  const applied = useRef(false)

  return (
    <EditorRefPlugin
      ref={(editor) => {
        if (!editor || applied.current) {
          return
        }

        applied.current = true

        const slateEditor = (editor as unknown as InternalEditor)._internal
          .slateEditor.instance

        if (!slateEditor) {
          return
        }

        const yjsEditor = withYjs(slateEditor, {
          sharedRoot,
          localOrigin: Symbol('local'),
        }) as unknown as YjsEditor

        yjsEditor.connect()
        onSlateEditor(slateEditor)
      }}
    />
  )
}

/**
 * Creates two test editors synced through a shared Y.Doc instead of
 * patch forwarding.
 */
export async function createTestEditorsWithYjs(
  options: Options = {},
): Promise<Pick<Context, 'editor' | 'locator' | 'editorB' | 'locatorB'>> {
  const editorRef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()

  const keyGenerator = createTestKeyGenerator('ea-')
  const keyGeneratorB = createTestKeyGenerator('eb-')
  const schemaDefinition = options.schemaDefinition ?? defineSchema({})

  const yDoc = new Y.Doc()
  const sharedRoot = yDoc.get('content', Y.XmlText) as Y.XmlText

  const slateEditorA = {current: null as PortableTextSlateEditor | null}
  const slateEditorB = {current: null as PortableTextSlateEditor | null}

  render(
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <YjsPlugin
          sharedRoot={sharedRoot}
          onSlateEditor={(editor) => {
            slateEditorA.current = editor
          }}
        />
        <PortableTextEditable
          {...options.editableProps}
          data-testid="editor-a"
        />
      </EditorProvider>
      <EditorProvider
        initialConfig={{
          keyGenerator: keyGeneratorB,
          schemaDefinition,
        }}
      >
        <EditorRefPlugin ref={editorBRef} />
        <YjsPlugin
          sharedRoot={sharedRoot}
          onSlateEditor={(editor) => {
            slateEditorB.current = editor
          }}
        />
        <PortableTextEditable
          {...options.editableProps}
          data-testid="editor-b"
        />
      </EditorProvider>
    </>,
  )

  const locator = page.getByTestId('editor-a')
  const locatorB = page.getByTestId('editor-b')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  await vi.waitFor(() => expect.element(locatorB).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    editorB: editorBRef.current!,
    locatorB,
  }
}

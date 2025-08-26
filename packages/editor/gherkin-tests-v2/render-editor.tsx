import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {BrowserPage} from '@vitest/browser/context'
import React from 'react'
import type {Editor} from '../src'
import {PortableTextEditable} from '../src/editor/Editable'
import type {EditorActor} from '../src/editor/editor-machine'
import {EditorProvider} from '../src/editor/editor-provider'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {InternalEditorAfterRefPlugin} from '../src/plugins/plugin.internal.editor-actor-ref'
import {InternalSlateEditorRefPlugin} from '../src/plugins/plugin.internal.slate-editor-ref'
import type {PortableTextSlateEditor} from '../src/types/editor'
import type {Context} from './step-context'

export function RenderEditor(
  props: React.PropsWithChildren<{
    context: Context
    page: BrowserPage
  }>,
) {
  const editorActorRef = React.createRef<EditorActor>()
  const slateRef = React.createRef<PortableTextSlateEditor>()
  const editorRef = React.createRef<Editor>()
  const keyGenerator = createTestKeyGenerator('e0-')
  const initialValue = [
    {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    },
  ]

  props.context.editor = {
    ref: editorRef as React.RefObject<Editor>,
    actorRef: editorActorRef as React.RefObject<EditorActor>,
    slateRef: slateRef as React.RefObject<PortableTextSlateEditor>,
    locator: props.page.getByRole('textbox'),
    value: () => editorRef.current?.getSnapshot().context.value ?? [],
    snapshot: () => editorRef.current!.getSnapshot(),
    selection: () => editorRef.current?.getSnapshot().context.selection ?? null,
  }

  return (
    <EditorProvider
      initialConfig={{
        schemaDefinition: defineSchema({
          annotations: [{name: 'comment'}, {name: 'link'}],
          decorators: [{name: 'em'}, {name: 'strong'}],
          blockObjects: [{name: 'image'}, {name: 'break'}],
          inlineObjects: [{name: 'stock-ticker'}],
          lists: [{name: 'bullet'}, {name: 'number'}],
          styles: [
            {name: 'normal'},
            {name: 'h1'},
            {name: 'h2'},
            {name: 'h3'},
            {name: 'h4'},
            {name: 'h5'},
            {name: 'h6'},
            {name: 'blockquote'},
          ],
        }),
        keyGenerator,
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      {props.children}
      <InternalEditorAfterRefPlugin ref={editorActorRef} />
      <InternalSlateEditorRefPlugin ref={slateRef} />
      <PortableTextEditable />
    </EditorProvider>
  )
}

import * as React from 'react'
import {describe, expect, test} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor/create-editor'
import {defineSchema} from '../src/editor/define-schema'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider, useEditor} from '../src/editor/editor-provider'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'

describe('event.insert.block', () => {
  test('Scenario: Inserting block with custom _key', () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
      },
      placement: 'auto',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'custom key',
        _type: 'block',
        children: [
          {
            _key: 'k4',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })

  test('Scenario: Inserting two blocks with same custom _key', () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
      },
      placement: 'auto',
    })

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        _key: 'custom key',
        children: [
          {
            _type: 'span',
            text: 'bar',
          },
        ],
      },
      placement: 'auto',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'custom key',
        _type: 'block',
        children: [
          {
            _key: 'k4',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k5',
        _type: 'block',
        children: [
          {
            _key: 'k6',
            _type: 'span',
            text: 'bar',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
    ])
  })
})

const EditorRefPlugin = React.forwardRef<Editor | null>((_, ref) => {
  const editor = useEditor()

  const portableTextEditorRef = React.useRef(editor)

  React.useImperativeHandle(ref, () => portableTextEditorRef.current, [])

  return null
})

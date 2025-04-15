import * as React from 'react'
import {describe, expect, test} from 'vitest'
import {render} from 'vitest-browser-react'
import type {Editor} from '../src/editor/create-editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {defineSchema} from '../src/editor/editor-schema'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

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
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
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
            _key: 'k2',
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
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
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
      placement: 'after',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'custom key',
        _type: 'block',
        children: [
          {
            _key: 'k2',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k4',
        _type: 'block',
        children: [
          {
            _key: 'k3',
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

  test('Scenario: Stripping unknown text block props', () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({lists: [{name: 'bullet'}]}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
      </EditorProvider>,
    )

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'foo',
          },
        ],
        foo: 'bar', // <-- unknown prop
        baz: {
          fizz: 'buzz',
        }, // <-- unknown prop
        listItem: 'bullet', // <-- known prop, in the schema
        level: 1, // <-- known prop that doesn't need to be in the schema
        style: 'h1', // <-- known prop, but not in the schema
      },
      placement: 'after',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
            _type: 'span',
            text: 'foo',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
        listItem: 'bullet',
        level: 1,
      },
    ])
  })

  test('Scenario: Stripping unknown span props', () => {
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

    editorRef.current?.send({
      type: 'insert.block',
      block: {
        _type: 'block',
        children: [
          {
            _type: 'span',
            text: 'foo',
            foo: 'bar', // <-- unknown prop
            baz: {
              fizz: 'buzz',
            }, // <-- unknown prop
          },
        ],
      },
      placement: 'after',
    })

    expect(editorRef.current?.getSnapshot().context.value).toEqual([
      {
        _key: 'k0',
        _type: 'block',
        children: [
          {
            _key: 'k1',
            _type: 'span',
            text: '',
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _key: 'k2',
        _type: 'block',
        children: [
          {
            _key: 'k3',
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
})

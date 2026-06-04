import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {InternalEditorEngineRefPlugin} from '../src/plugins/plugin.internal.editor-engine-ref'
import {createTestEditor} from '../src/test/vitest'
import type {PortableTextEditorEngine} from '../src/types/editor-engine'

describe('no-op operations are not recorded to history', () => {
  test('Scenario: unset of an undefined property does not pollute history', async () => {
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}],
        lists: [{name: 'bullet'}],
      }),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })

    editor.send({type: 'insert.text', text: ' bar'})

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })

    editor.send({type: 'unset', at: [{_key: 'b0'}, 'level']})

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })
  })

  test('Scenario: insert_text with empty text does not pollute history', async () => {
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({styles: [{name: 'normal'}]}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })

    editor.send({type: 'insert.text', text: ' bar'})

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })

    editor.send({type: 'insert.text', text: ''})

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })
  })

  test('Scenario: remove_text with empty text does not pollute history', async () => {
    const engineRef = React.createRef<PortableTextEditorEngine>()
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({styles: [{name: 'normal'}]}),
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          style: 'normal',
          children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
      children: <InternalEditorEngineRefPlugin ref={engineRef} />,
    })

    editor.send({type: 'insert.text', text: ' bar'})

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })

    editor.send({
      type: 'remove.text',
      at: [{_key: 'b0'}, 'children', {_key: 's0'}],
      offset: 0,
      text: '',
    })

    await vi.waitFor(() => {
      expect(engineRef.current!.history.undos).toHaveLength(1)
    })
  })
})

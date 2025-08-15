import {defineSchema} from '@portabletext/schema'
import * as React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {defineBehavior, execute} from '../src/behaviors'
import type {InsertPlacement} from '../src/behaviors/behavior.types.event'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {getTersePt} from '../src/internal-utils/terse-pt'
import {createTestKeyGenerator} from '../src/internal-utils/test-key-generator'
import {BehaviorPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {getFocusBlock} from '../src/selectors'

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

  test('Scenario: Inserting block in an empty editor', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({}),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <BehaviorPlugin
          behaviors={[
            defineBehavior<{placement: InsertPlacement; text: string}>({
              on: 'custom.insert',
              actions: [
                ({snapshot, event}) => {
                  const focusBlock = getFocusBlock(snapshot)

                  if (!focusBlock) {
                    return []
                  }

                  return [
                    execute({
                      type: 'delete.block',
                      at: focusBlock.path,
                    }),
                    execute({
                      type: 'insert.block',
                      block: {
                        _key: snapshot.context.keyGenerator(),
                        _type: snapshot.context.schema.block.name,
                        children: [
                          {
                            _key: snapshot.context.keyGenerator(),
                            _type: 'span',
                            text: event.text,
                          },
                        ],
                      },
                      placement: event.placement,
                      select: 'end',
                    }),
                  ]
                },
              ],
            }),
          ]}
        />
        <PortableTextEditable />
      </EditorProvider>,
    )

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
              marks: [],
              text: '',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({type: 'focus'})
    editorRef.current?.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'foo',
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
          _type: 'block',
          children: [
            {
              _key: 'k3',
              _type: 'span',
              marks: [],
              text: 'foo',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({type: 'focus'})
    editorRef.current?.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'bar',
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k6',
          _type: 'block',
          children: [
            {
              _key: 'k7',
              _type: 'span',
              marks: [],
              text: 'bar',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editorRef.current?.send({type: 'focus'})
    editorRef.current?.send({
      type: 'custom.insert',
      placement: 'auto',
      text: 'baz',
    })

    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.value).toEqual([
        {
          _key: 'k10',
          _type: 'block',
          children: [
            {
              _key: 'k11',
              _type: 'span',
              marks: [],
              text: 'baz',
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Inserting block with lonely inline object', async () => {
    const editorRef = React.createRef<Editor>()

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition: defineSchema({
            inlineObjects: [
              {
                name: 'stock-ticker',
                fields: [{name: 'symbol', type: 'string'}],
              },
            ],
          }),
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
        children: [{_type: 'stock-ticker', symbol: 'AAPL'}],
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(getTersePt(editorRef.current!.getSnapshot().context)).toEqual([
        ',{stock-ticker},',
      ])
    })
  })
})

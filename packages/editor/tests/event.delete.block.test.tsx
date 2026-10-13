import {
  applyAll,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

describe('event.delete.block', () => {
  test('Scenario: Deleting lonely block object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    let foreignValue = [
      {
        _type: 'image',
        _key: imageKey,
      },
    ]
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: foreignValue,
      schemaDefinition: defineSchema({
        block: {fields: [{name: 'foo', type: 'string'}]},
        blockObjects: [{name: 'image'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
              foreignValue = applyAll(foreignValue, [patch])
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'delete.block',
      at: [{_key: imageKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(foreignValue).toEqual(undefined)

      expect(patches).toEqual([unset([{_key: imageKey}]), unset([])])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: 'k3'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      const expectedValue = [
        {
          _type: 'block',
          _key: 'k3',
          children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
          foo: 'bar',
        },
      ]

      expect(editor.getSnapshot().context.value).toEqual(expectedValue)
      expect(foreignValue).toEqual(expectedValue)
      expect(patches.slice(2)).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _type: 'block',
              _key: 'k3',
              children: [{_type: 'span', _key: 'k4', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        set('bar', [{_key: 'k3'}, 'foo']),
      ])
    })
  })

  test('Scenario: Deleting lonely text block creates a placeholder block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'foo',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'delete.block',
      at: [{_key: blockKey}],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [{_type: 'span', _key: 'k5', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Deleting a container removes the container and its content', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const codeBlockKey = keyGenerator()
    const line1Key = keyGenerator()
    const line1SpanKey = keyGenerator()
    const line2Key = keyGenerator()
    const line2SpanKey = keyGenerator()
    const barKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'code-block',
            fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        textBlock(fooKey, fooSpanKey, 'foo'),
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            textBlock(line1Key, line1SpanKey, 'a'),
            textBlock(line2Key, line2SpanKey, 'b'),
          ],
        },
        textBlock(barKey, barSpanKey, 'bar'),
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'code-block',
              arrayField: 'lines',
              render: ({attributes, children}) => (
                <pre {...attributes}>{children}</pre>
              ),
            }),
          ]}
        />
      ),
    })

    editor.send({type: 'delete.block', at: [{_key: codeBlockKey}]})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        textBlock(fooKey, fooSpanKey, 'foo'),
        textBlock(barKey, barSpanKey, 'bar'),
      ])
    })
  })

  test('Scenario: Deleting a block object through a path into one of its fields', async () => {
    const keyGenerator = createTestKeyGenerator()
    const fooKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {name: 'image', fields: [{name: 'caption', type: 'string'}]},
        ],
      }),
      initialValue: [
        textBlock(fooKey, fooSpanKey, 'foo'),
        {_type: 'image', _key: imageKey, caption: 'bar'},
      ],
    })

    editor.send({type: 'delete.block', at: [{_key: imageKey}, 'caption']})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        textBlock(fooKey, fooSpanKey, 'foo'),
      ])
    })
  })
})

function textBlock(key: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

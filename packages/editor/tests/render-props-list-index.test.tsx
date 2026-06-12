import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer, defineTextBlock} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const listSchema = defineSchema({
  lists: [{name: 'number'}, {name: 'bullet'}],
})

describe('listIndex', () => {
  test('catch-all defineTextBlock receives listIndex for list-item blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: listSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k1',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', _key: 's1', text: 'two', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', _key: 's2', text: 'three', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: '*',
              render: ({attributes, children, listIndex, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-list-index={listIndex}
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      const k1 = document.querySelector('[data-testid="block-k1"]')
      const k2 = document.querySelector('[data-testid="block-k2"]')
      expect(k0?.getAttribute('data-list-index')).toEqual('1')
      expect(k1?.getAttribute('data-list-index')).toEqual('2')
      expect(k2?.getAttribute('data-list-index')).toEqual('3')
    })
  })

  test('listIndex is undefined for non-list-item blocks', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: listSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 's0', text: 'plain', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: '*',
              render: ({attributes, children, listIndex, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-list-index={
                    listIndex === undefined ? 'none' : String(listIndex)
                  }
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      expect(k0?.getAttribute('data-list-index')).toEqual('none')
    })
  })

  test('listIndex resets across non-list interrupts', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: listSchema,
      initialValue: [
        {
          _type: 'block',
          _key: 'k0',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k1',
          children: [{_type: 'span', _key: 's1', text: 'plain', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: 'k2',
          listItem: 'number',
          level: 1,
          children: [{_type: 'span', _key: 's2', text: 'one again', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineTextBlock({
              type: '*',
              render: ({attributes, children, listIndex, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-list-index={
                    listIndex === undefined ? 'none' : String(listIndex)
                  }
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      const k1 = document.querySelector('[data-testid="block-k1"]')
      const k2 = document.querySelector('[data-testid="block-k2"]')
      expect(k0?.getAttribute('data-list-index')).toEqual('1')
      expect(k1?.getAttribute('data-list-index')).toEqual('none')
      expect(k2?.getAttribute('data-list-index')).toEqual('1')
    })
  })

  test('listIndex is undefined for list-items inside a container', async () => {
    const keyGenerator = createTestKeyGenerator()
    await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'number'}, {name: 'bullet'}],
        blockObjects: [
          {
            name: 'callout',
            fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
          },
        ],
      }),
      initialValue: [
        {
          _type: 'callout',
          _key: 'c0',
          content: [
            {
              _type: 'block',
              _key: 'k0',
              listItem: 'number',
              level: 1,
              children: [{_type: 'span', _key: 's0', text: 'one', marks: []}],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: 'k1',
              listItem: 'number',
              level: 1,
              children: [{_type: 'span', _key: 's1', text: 'two', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({type: 'callout', arrayField: 'content'}),
            defineTextBlock({
              type: '*',
              render: ({attributes, children, listIndex, node}) => (
                <div
                  data-testid={`block-${node._key}`}
                  data-list-index={
                    listIndex === undefined ? 'none' : String(listIndex)
                  }
                  {...attributes}
                >
                  {children}
                </div>
              ),
            }),
          ]}
        />
      ),
    })

    await vi.waitFor(() => {
      const k0 = document.querySelector('[data-testid="block-k0"]')
      const k1 = document.querySelector('[data-testid="block-k1"]')
      expect(k0?.getAttribute('data-list-index')).toEqual('none')
      expect(k1?.getAttribute('data-list-index')).toEqual('none')
    })
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {defineBehavior, execute, raise} from '../src/behaviors'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {BehaviorPlugin} from '../src/plugins'

describe('event.block.set', () => {
  test('Scenario: adding block object property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [
          {
            name: 'url',
            fields: [
              {name: 'description', type: 'string'},
              {name: 'href', type: 'string'},
            ],
          },
        ],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      props: {
        description: 'Sanity is a headless CMS',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ])
    })
  })

  test('Scenario: updating block object _key', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    const newUrlBlockKey = keyGenerator()

    editor.send({
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      props: {
        _key: newUrlBlockKey,
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: newUrlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: updating block object _type is a noop', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
    })

    const urlBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: urlBlockKey,
        _type: 'url',
        href: 'https://www.sanity.io',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: urlBlockKey}],
      props: {
        _type: 'block',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: adding text block property', async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: textBlockKey}],
      props: {
        style: 'h1',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          style: 'h1',
        },
      ])
    })
  })

  test("Scenario: Text blocks don't accept custom props", async () => {
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    const textBlockKey = keyGenerator()

    editor.send({
      type: 'insert.block',
      block: {
        _key: textBlockKey,
        _type: 'block',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          style: 'normal',
        },
      ])
    })

    editor.send({
      type: 'block.set',
      at: [{_key: textBlockKey}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Setting an annotation by raising', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const markDefKey = keyGenerator()
    const {editor} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior<{
              name: string
              value: Record<string, unknown>
            }>({
              on: 'custom.set annotation',
              actions: [
                ({event}) => [
                  raise({
                    type: 'child.set',
                    at: [{_key: blockKey}, 'children', {_key: spanKey}],
                    props: {
                      marks: [markDefKey],
                    },
                  }),
                  raise({
                    type: 'block.set',
                    at: [{_key: blockKey}],
                    props: {
                      markDefs: [
                        {
                          _key: markDefKey,
                          _type: event.name,
                          ...event.value,
                        },
                      ],
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
        },
      ],
    })

    editor.send({
      type: 'custom.set annotation',
      name: 'link',
      value: {
        href: 'https://www.sanity.io',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
          ],
          markDefs: [
            {_key: markDefKey, _type: 'link', href: 'https://www.sanity.io'},
          ],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Setting an annotation by executing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const markDefKey = keyGenerator()
    const {editor} = await createTestEditor({
      children: (
        <BehaviorPlugin
          behaviors={[
            defineBehavior<{
              name: string
              value: Record<string, unknown>
            }>({
              on: 'custom.set annotation',
              actions: [
                ({event}) => [
                  execute({
                    type: 'child.set',
                    at: [{_key: blockKey}, 'children', {_key: spanKey}],
                    props: {
                      marks: [markDefKey],
                    },
                  }),
                  execute({
                    type: 'block.set',
                    at: [{_key: blockKey}],
                    props: {
                      markDefs: [
                        {
                          _key: markDefKey,
                          _type: event.name,
                          ...event.value,
                        },
                      ],
                    },
                  }),
                ],
              ],
            }),
          ]}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
        },
      ],
    })

    editor.send({
      type: 'custom.set annotation',
      name: 'link',
      value: {
        href: 'https://www.sanity.io',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [
            {_key: spanKey, _type: 'span', text: 'foo', marks: [markDefKey]},
          ],
          markDefs: [
            {_key: markDefKey, _type: 'link', href: 'https://www.sanity.io'},
          ],
          style: 'normal',
        },
      ])
    })
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {execute, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.block.set', () => {
  test('Scenario: adding block object property', async () => {
    const patches: Array<Patch> = []
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
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ])
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: urlBlockKey}, 'description'],
          value: 'Sanity is a headless CMS',
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: urlBlockKey}, 'href'],
          value: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: updating block object _key', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: newUrlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [0, '_key'],
          value: newUrlBlockKey,
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: newUrlBlockKey}, 'href'],
          value: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: updating block object _type is a noop', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url', fields: [{name: 'href', type: 'string'}]}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: urlBlockKey,
          _type: 'url',
          href: 'https://www.sanity.io',
        },
      ])
      expect(patches.slice(4)).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: urlBlockKey}, 'href'],
          value: 'https://www.sanity.io',
        },
      ])
    })
  })

  test('Scenario: adding text block property', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
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
      expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          style: 'normal',
        },
      ])
      expect(patches.slice(2)).toEqual([
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _key: textBlockKey,
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
          ],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [{_key: 'k0'}],
        },
        {
          origin: 'local',
          type: 'unset',
          path: [],
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
      expect(editor.getSnapshot().context.value).toMatchObject([
        {
          _key: textBlockKey,
          _type: 'block',
          style: 'h1',
        },
      ])
      expect(patches.slice(5)).toEqual([
        {
          origin: 'local',
          type: 'setIfMissing',
          path: [],
          value: [],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [0],
          position: 'before',
          items: [
            {
              _key: textBlockKey,
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
          ],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: textBlockKey}, 'markDefs'],
          value: [],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: textBlockKey}, 'style'],
          value: 'h1',
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
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const markDefKey = keyGenerator()
    const {editor} = await createTestEditor({
      children: (
        <>
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
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                patches.push(event.patch)
              }
            }}
          />
        </>
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
          markDefs: [],
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
      expect(editor.getSnapshot().context.value).toEqual([
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
      expect(patches).toEqual([
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'children', {_key: spanKey}, 'marks'],
          value: [markDefKey],
        },
        {
          origin: 'local',
          type: 'set',
          path: [{_key: blockKey}, 'markDefs'],
          value: [
            {_key: markDefKey, _type: 'link', href: 'https://www.sanity.io'},
          ],
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

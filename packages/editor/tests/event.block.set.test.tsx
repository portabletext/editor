import {insert, set, setIfMissing, unset} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {execute, raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.block.set', () => {
  test('Scenario: setting undefined block object property is a noop', async () => {
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
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
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
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
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
        },
      ])
      expect(patches.slice(4)).toEqual([])
    })
  })

  test('Scenario: setting defined block object property', async () => {
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
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
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
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
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
      // Only the changed property (description) emits a patch. Unchanged
      // properties (href) are not re-emitted since properties are stored
      // directly on the node (no value wrapper).
      expect(patches.slice(4)).toEqual([
        set('Sanity is a headless CMS', [{_key: urlBlockKey}, 'description']),
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
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
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
        insert(
          [
            {
              _key: urlBlockKey,
              _type: 'url',
              href: 'https://www.sanity.io',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
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
      expect(patches.slice(4)).toEqual([])
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
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
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
        style: 'normal',
      },
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        insert(
          [
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
              style: 'normal',
            },
          ],
          'before',
          [{_key: 'k0'}],
        ),
        unset([{_key: 'k0'}]),
        unset([]),
        setIfMissing([], []),
        set([], [{_key: textBlockKey}, 'markDefs']),
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
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: textBlockKey,
          _type: 'block',
          children: [{_key: 'k3', _type: 'span', text: '', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ])

      expect(patches.slice(7)).toEqual([
        setIfMissing([], []),
        insert(
          [
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
          'before',
          [0],
        ),
        set('h1', [{_key: textBlockKey}, 'style']),
      ])
    })
  })

  test('Scenario: Undoing `set` of text block property', async () => {
    let patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        block: {fields: [{name: '_map', type: 'object'}]},
      }),
      initialValue: [
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              for (const patch of event.patches) {
                const {origin: _, ...rawPatch} = patch
                patches.push(rawPatch)
              }
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'block.set',
      at: [{_key: blockKey}],
      props: {
        _map: {
          typePath: 'title',
          documentPath: 'title',
        },
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
          _map: {
            typePath: 'title',
            documentPath: 'title',
          },
        },
      ])

      expect(patches).toEqual([
        set({typePath: 'title', documentPath: 'title'}, [
          {_key: blockKey},
          '_map',
        ]),
      ])
    })

    patches = []

    editor.send({type: 'history.undo'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: blockKey,
          _type: 'block',
          children: [{_key: spanKey, _type: 'span', text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches).toEqual([unset([{_key: blockKey}, '_map'])])
    })
  })

  test("Scenario: Text blocks don't accept undefined custom props", async () => {
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

  test('Scenario: Text blocks accept defined custom props', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
        block: {fields: [{name: 'foo', type: 'string'}]},
      }),
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              const {origin: _, ...patch} = event.patch
              patches.push(patch)
            }
          }}
        />
      ),
    })

    editor.send({
      type: 'block.set',
      at: [{_key: 'k0'}],
      props: {
        foo: 'bar',
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k0',
          _type: 'block',
          children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
          foo: 'bar',
          markDefs: [],
          style: 'normal',
        },
      ])

      expect(patches).toEqual([
        setIfMissing([], []),
        insert(
          [
            {
              _key: 'k0',
              _type: 'block',
              children: [{_key: 'k1', _type: 'span', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
        ),
        set('bar', [{_key: 'k0'}, 'foo']),
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
          style: 'normal',
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

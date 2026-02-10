import {
  applyAll,
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {createTestEditor} from '../src/test/vitest'

describe('event.patch', () => {
  test('Scenario: Deleting empty block above non-empty text block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const blockAKey = keyGenerator()
    const spanAKey = keyGenerator()
    const blockBKey = keyGenerator()
    const spanBKey = keyGenerator()

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      initialValue: [
        {
          _key: blockAKey,
          _type: 'block',
          children: [{_key: spanAKey, _type: 'span', text: '', marks: []}],
          style: 'normal',
          markDefs: [],
        },
        {
          _key: blockBKey,
          _type: 'block',
          children: [{_key: spanBKey, _type: 'span', text: 'bar', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockAKey}, 'children', {_key: spanAKey}],
          offset: 0,
        },
        backward: false,
      })
    })

    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['bar'])
    })

    expect(patches).toEqual([
      {
        type: 'unset',
        path: [{_key: blockAKey}],
        origin: 'local',
      },
    ])
  })

  test('Scenario: Inserting two text blocks where the first one is empty', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
    })

    editor.send({type: 'focus'})

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        focus: {
          path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
          offset: 0,
        },
        backward: false,
      })
    })

    const emptyParagraph = {
      _type: 'block',
      _key: keyGenerator(),
      children: [{_type: 'span', _key: keyGenerator(), text: '', marks: []}],
      markDefs: [],
      style: 'normal',
    }
    const h1 = {
      _type: 'block',
      _key: keyGenerator(),
      children: [{_type: 'span', _key: keyGenerator(), text: 'Foo', marks: []}],
      markDefs: [],
      style: 'h1',
    }

    editor.send({
      type: 'insert.blocks',
      blocks: [emptyParagraph, h1],
      placement: 'auto',
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([emptyParagraph, h1])
    })

    expect(patches).toEqual(
      [
        // Initial setting up patch
        setIfMissing([], []),
        // Inserting placeholder block
        set(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          [],
        ),
        // Inserting new empty paragraph before placeholder
        insert([emptyParagraph], 'before', [{_key: 'k0'}]),
        // Removing placeholder since placement is 'auto' and that means
        // "merging" into the existing text
        unset([{_key: 'k0'}]),
        // Unsetting everything since the editor is "empty"
        unset([]),
        // Initial setting up patch
        setIfMissing([], []),
        // Inserting the empty paragraph which can now be considered the placeholder
        set([emptyParagraph], []),
        // Inserting the h1
        insert([h1], 'after', [{_key: emptyParagraph._key}]),
      ].map((patch) => ({...patch, origin: 'local'})),
    )
  })

  test('Scenario: Inserting block object on empty editor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'patch') {
              patches.push(event.patch)
            }
          }}
        />
      ),
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    editor.send({
      type: 'insert.block',
      block: {
        _type: 'image',
      },
      placement: 'auto',
      select: 'none',
    })

    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [],
          type: 'setIfMissing',
          value: [],
        },
        {
          origin: 'local',
          path: [],
          type: 'set',
          value: [
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
          ],
        },
        {
          origin: 'local',
          type: 'insert',
          path: [{_key: 'k0'}],
          position: 'before',
          items: [
            {
              _type: 'image',
              _key: 'k2',
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
  })

  describe('Scenario: Setting and unsetting the editor', () => {
    test('regular text block', async () => {
      const keyGenerator = createTestKeyGenerator()
      const patches: Array<Patch> = []
      const {editor, locator} = await createTestEditor({
        keyGenerator,
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

      await userEvent.click(locator)
      await userEvent.type(locator, 'f')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])

        expect(patches).toEqual([
          setIfMissing([], []),
          set(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            [],
          ),
          diffMatchPatch('', 'f', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ])
      })

      await userEvent.keyboard('{ControlOrMeta>}{A}{/ControlOrMeta}')
      await userEvent.keyboard('{Delete}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])

        expect(patches.slice(3)).toEqual([
          diffMatchPatch('f', '', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
          unset([]),
        ])
      })

      await userEvent.type(locator, 'f')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
            markDefs: [],
            style: 'normal',
          },
        ])

        expect(patches.slice(5)).toEqual([
          setIfMissing([], []),
          set(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            [],
          ),
          diffMatchPatch('', 'f', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ])
      })
    })

    test('text block with custom field', async () => {
      const keyGenerator = createTestKeyGenerator()
      const patches: Array<Patch> = []
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({
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

      await userEvent.click(locator)
      await userEvent.type(locator, 'f')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
            markDefs: [],
            style: 'normal',
            foo: 'bar',
          },
        ])

        expect(patches).toEqual([
          setIfMissing([], []),
          set(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            [],
          ),
          set('bar', [{_key: 'k0'}, 'foo']),
          diffMatchPatch('', 'f', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ])
      })

      await userEvent.keyboard('{ControlOrMeta>}{A}{/ControlOrMeta}')
      await userEvent.keyboard('{Delete}')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
            markDefs: [],
            style: 'normal',
            foo: 'bar',
          },
        ])

        expect(patches.slice(4)).toEqual([
          diffMatchPatch('f', '', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ])
      })

      await userEvent.type(locator, 'f')

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: 'k0',
            children: [{_type: 'span', _key: 'k1', text: 'f', marks: []}],
            markDefs: [],
            style: 'normal',
            foo: 'bar',
          },
        ])

        expect(patches.slice(5)).toEqual([
          diffMatchPatch('', 'f', [
            {_key: 'k0'},
            'children',
            {_key: 'k1'},
            'text',
          ]),
        ])
      })
    })
  })

  describe('applying patches to remote value', () => {
    describe('remote value: []', () => {
      test('Scenario: Typing into empty editor', async () => {
        let remoteValue: PortableTextBlock[] = []

        const {editor, locator} = await createTestEditor({
          children: (
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  const {origin: _, ...patch} = event.patch
                  remoteValue = applyAll(remoteValue, [patch])
                }
              }}
            />
          ),
        })

        await userEvent.click(locator)
        await userEvent.type(locator, 'hello')

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(remoteValue)
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello'])
        })
      })

      test('Scenario: Pasting into empty editor', async () => {
        let remoteValue: PortableTextBlock[] = []

        const {editor, locator} = await createTestEditor({
          children: (
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  const {origin: _, ...patch} = event.patch
                  remoteValue = applyAll(remoteValue, [patch])
                }
              }}
            />
          ),
        })

        await userEvent.click(locator)

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.selection).not.toBeNull()
        })

        const dataTransfer = new DataTransfer()
        dataTransfer.setData('text/plain', 'hello world')

        editor.send({
          type: 'clipboard.paste',
          originEvent: {dataTransfer},
          position: {
            selection: editor.getSnapshot().context.selection!,
          },
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(remoteValue)
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'hello world',
          ])
        })
      })
    })

    describe('remote value: undefined', () => {
      test('Scenario: Typing into empty editor', async () => {
        let remoteValue: PortableTextBlock[] | undefined

        const {editor, locator} = await createTestEditor({
          children: (
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  const {origin: _, ...patch} = event.patch
                  remoteValue = applyAll(remoteValue, [patch])
                }
              }}
            />
          ),
        })

        await userEvent.click(locator)
        await userEvent.type(locator, 'hello')

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(remoteValue)
          expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello'])
        })
      })

      test('Scenario: Pasting into empty editor', async () => {
        let remoteValue: PortableTextBlock[] | undefined

        const {editor, locator} = await createTestEditor({
          children: (
            <EventListenerPlugin
              on={(event) => {
                if (event.type === 'patch') {
                  const {origin: _, ...patch} = event.patch
                  remoteValue = applyAll(remoteValue, [patch])
                }
              }}
            />
          ),
        })

        await userEvent.click(locator)

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.selection).not.toBeNull()
        })

        const dataTransfer = new DataTransfer()
        dataTransfer.setData('text/plain', 'hello world')

        editor.send({
          type: 'clipboard.paste',
          originEvent: {dataTransfer},
          position: {
            selection: editor.getSnapshot().context.selection!,
          },
        })

        await vi.waitFor(() => {
          expect(editor.getSnapshot().context.value).toEqual(remoteValue)
          expect(getTersePt(editor.getSnapshot().context)).toEqual([
            'hello world',
          ])
        })
      })
    })
  })

  test('Scenario: Deleting all text with annotation', async () => {
    const keyGenerator = createTestKeyGenerator()
    const patches: Array<Patch> = []
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()
    const linkKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'foo', marks: []},
            {_type: 'span', _key: span2Key, text: 'bar', marks: [linkKey]},
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
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

    await userEvent.click(locator)
    await userEvent.keyboard('{ControlOrMeta>}{A}{/ControlOrMeta}')
    await userEvent.keyboard('{Delete}')

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual([''])
    })

    expect(patches).toEqual(
      [
        diffMatchPatch('foo', '', [
          {_key: blockKey},
          'children',
          {_key: span1Key},
          'text',
        ]),
        diffMatchPatch('bar', '', [
          {_key: blockKey},
          'children',
          {_key: span2Key},
          'text',
        ]),
        set([], [{_key: blockKey}, 'children', {_key: span2Key}, 'marks']),
        unset([{_key: blockKey}, 'children', {_key: span2Key}]),
        set([], [{_key: blockKey}, 'markDefs']),
        unset([]),
      ].map((patch) => ({...patch, origin: 'local'})),
    )
  })
})

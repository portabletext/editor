import {
  diffMatchPatch,
  insert,
  set,
  setIfMissing,
  unset,
  type Patch,
} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
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
        insert(
          [
            {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [0],
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
        insert([emptyParagraph], 'before', [0]),
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
          path: [0],
          type: 'insert',
          position: 'before',
          items: [
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
          insert(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            'before',
            [0],
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
          insert(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            'before',
            [0],
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
          insert(
            [
              {
                _type: 'block',
                _key: 'k0',
                children: [{_type: 'span', _key: 'k1', text: '', marks: []}],
                markDefs: [],
                style: 'normal',
              },
            ],
            'before',
            [0],
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
})

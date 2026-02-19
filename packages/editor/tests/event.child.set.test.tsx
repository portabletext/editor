import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type Patch} from '../src'
import {EventListenerPlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'

describe('event.child.set', () => {
  test('Scenario: Setting properties on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const imageKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
          {
            _type: 'image',
            _key: imageKey,
            url: 'https://www.sanity.io/logo.svg',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'image',
            fields: [
              {name: 'alt', type: 'string'},
              {name: 'url', type: 'string'},
            ],
          },
        ],
      }),
    })

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{image},',
      ])
    })

    const newImageKey = keyGenerator()

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: imageKey}],
      props: {
        _type: 'image2',
        _key: newImageKey,
        alt: 'Sanity Logo',
        caption: 'Unknown field',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            ...initialValue[0]!.children.slice(0, 1),
            {
              _type: 'image',
              _key: newImageKey,
              url: 'https://www.sanity.io/logo.svg',
              alt: 'Sanity Logo',
            },
            ...initialValue[0]!.children.slice(2),
          ],
        },
      ])
    })
  })

  test('Scenario: Patches when setting properties on inline object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const cellKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
          {
            _type: 'cell',
            _key: cellKey,
            alive: false,
            abilities: {
              fly: true,
              swim: false,
            },
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'cell',
            fields: [
              {
                name: 'alive',
                type: 'boolean',
              },
              {
                name: 'abilities',
                type: 'object',
              },
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

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{cell},',
      ])
    })

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: cellKey}],
      props: {
        alive: true,
      },
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            ...initialValue[0]!.children.slice(0, 1),
            {
              ...initialValue[0]!.children[1],
              alive: true,
            },
            ...initialValue[0]!.children.slice(2),
          ],
        },
      ])
    })

    // Only the changed property emits a patch. Unchanged properties
    // (abilities) are not re-emitted since properties are stored directly
    // on the node (no value wrapper).
    await vi.waitFor(() => {
      expect(patches).toEqual([
        {
          origin: 'local',
          path: [{_key: blockKey}, 'children', {_key: cellKey}, 'alive'],
          type: 'set',
          value: true,
        },
      ])
    })
  })

  test('Scenario: Setting _key on inline object', async () => {
    const patches: Array<Patch> = []
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const cellKey = keyGenerator()
    const span1 = {
      _type: 'span',
      _key: keyGenerator(),
      text: '',
      marks: [],
    }
    const cell = {
      _type: 'cell',
      _key: cellKey,
      alive: false,
      abilities: {
        fly: true,
        swim: false,
      },
    }
    const span2 = {
      _type: 'span',
      _key: keyGenerator(),
      text: '',
      marks: [],
    }
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [span1, cell, span2],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'cell',
            fields: [
              {name: 'alive', type: 'boolean'},
              {name: 'abilities', type: 'object'},
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

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{cell},',
      ])
    })

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: cellKey}],
      props: {
        _key: 'new-cell-key',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            span1,
            {
              ...cell,
              _key: 'new-cell-key',
            },
            span2,
          ],
        },
      ])
    })

    // Only the changed property (_key) emits a patch. Unchanged properties
    // (alive, abilities) are not re-emitted since properties are stored
    // directly on the node (no value wrapper).
    await vi.waitFor(() => {
      return expect(patches).toEqual([
        {
          origin: 'local',
          path: [{_key: blockKey}, 'children', 1, '_key'],
          type: 'set',
          value: 'new-cell-key',
        },
      ])
    })
  })

  test('Scenario: Setting properties on span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: 'Hello',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual(['Hello'])
    })

    const newSpanKey = keyGenerator()

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: spanKey}],
      props: {
        _type: 'span2',
        _key: newSpanKey,
        marks: ['strong'],
        text: 'Hello, world!',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            {
              ...initialValue[0]!.children[0],
              _key: newSpanKey,
              text: 'Hello, world!',
              marks: ['strong'],
            },
          ],
        },
      ])
    })
  })

  test('Scenario: Setting "text" field on inline object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const mentionKey = keyGenerator()
    const initialValue = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
          {
            _type: 'mention',
            _key: mentionKey,
            text: 'J',
          },
          {
            _type: 'span',
            _key: keyGenerator(),
            text: '',
            marks: [],
          },
        ],
        style: 'normal',
        markDefs: [],
      },
    ]

    const {editor} = await createTestEditor({
      initialValue,
      keyGenerator,
      schemaDefinition: defineSchema({
        inlineObjects: [
          {
            name: 'mention',
            fields: [{name: 'text', type: 'string'}],
          },
        ],
      }),
    })

    await vi.waitFor(() => {
      return expect(getTersePt(editor.getSnapshot().context)).toEqual([
        ',{mention},',
      ])
    })

    editor.send({
      type: 'child.set',
      at: [{_key: blockKey}, 'children', {_key: mentionKey}],
      props: {
        text: 'John Doe',
      },
    })

    await vi.waitFor(() => {
      return expect(editor.getSnapshot().context.value).toEqual([
        {
          ...initialValue[0],
          children: [
            initialValue[0]!.children[0],
            {
              _type: 'mention',
              _key: mentionKey,
              text: 'John Doe',
            },
            initialValue[0]!.children[2],
          ],
        },
      ])
    })
  })
})

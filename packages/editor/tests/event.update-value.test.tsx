import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema, type EditorEmittedEvent} from '../src'
import {createTestEditor} from '../src/internal-utils/test-editor'
import {EventListenerPlugin} from '../src/plugins'

describe('event.update value', () => {
  test('Scenario: Clearing placeholder value', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    expect(editor.getSnapshot().context.value).toEqual([
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

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
    })
  })

  test('Scenario: Updating and then clearing placeholder value', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
              _type: 'span',
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
          _key: 'k0',
          _type: 'block',
          children: [
            {
              _key: 'k1',
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

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _key: 'k2',
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
      ])
    })
  })

  test('Scenario: updating block object property', async () => {
    const keyGenerator = createTestKeyGenerator()

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'url'}],
      }),
    })

    editor.send({
      type: 'insert.block object',
      blockObject: {
        name: 'url',
        value: {
          href: 'https://www.sanity.io',
        },
      },
      placement: 'auto',
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: 'k2',
          _type: 'url',
          href: 'https://www.sanity.io',
          description: 'Sanity is a headless CMS',
        },
      ],
    })

    await vi.waitFor(
      () => {
        return expect(editor.getSnapshot().context.value).toEqual([
          {
            _key: 'k2',
            _type: 'url',
            description: 'Sanity is a headless CMS',
            href: 'https://www.sanity.io',
          },
        ])
      },
      {
        timeout: 1100,
      },
    )
  })

  test('Scenario: Updating the text of an empty span', async () => {
    const keyGenerator = createTestKeyGenerator()

    const span = {_type: 'span', _key: 'span1', text: '', marks: []}
    const emptyFirstLine = {
      _key: 'block1', // Static key
      _type: 'block',
      children: [span],
      style: 'normal' as const,
      markDefs: [],
    }
    const populatedFirstLine = {
      ...emptyFirstLine,
      children: [{...span, text: 'e'}], // Same block key, different content
    }
    const lastLine = {
      _key: 'block2', // Static key
      _type: 'block',
      children: [{_type: 'span', _key: 'span2', text: 'last line', marks: []}],
      style: 'normal' as const,
      markDefs: [],
    }

    const {editor} = await createTestEditor({
      keyGenerator,
    })

    editor.send({
      type: 'update value',
      value: [emptyFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        emptyFirstLine,
        lastLine,
      ])
    })

    editor.send({
      type: 'update value',
      value: [populatedFirstLine, lastLine],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        populatedFirstLine,
        lastLine,
      ])
    })
  })

  test("Scenario: Updating before 'ready'", async () => {
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()
    const listBlock = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {
          _key: keyGenerator(),
          _type: 'span',
          text: 'foo',
          marks: [],
        },
      ],
      level: 1,
      listItem: 'bullet',
      markDefs: [],
      style: 'normal',
    }

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      keyGenerator,
      schemaDefinition: defineSchema({
        lists: [{name: 'bullet'}],
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [{_key: keyGenerator(), _type: 'span', text: 'a'}],
        },
      ],
    })

    editor.send({
      type: 'update value',
      value: [listBlock],
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([listBlock])
    })
  })

  test('Scenario: Adding blocks before existing block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const onEvent = vi.fn<() => EditorEmittedEvent>()

    const h2 = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'h2', marks: []}],
      style: 'h2',
      markDefs: [],
    }
    const h1 = {
      _key: keyGenerator(),
      _type: 'block',
      children: [{_key: keyGenerator(), _type: 'span', text: 'h1', marks: []}],
      style: 'h1',
      markDefs: [],
    }
    const paragraph = {
      _key: keyGenerator(),
      _type: 'block',
      children: [
        {_key: keyGenerator(), _type: 'span', text: 'paragraph', marks: []},
      ],
      style: 'normal',
      markDefs: [],
    }

    const {editor} = await createTestEditor({
      children: <EventListenerPlugin on={onEvent} />,
      keyGenerator,
      schemaDefinition: defineSchema({}),
    })

    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith({type: 'ready'})
    })

    editor.send({
      type: 'update value',
      value: [h2],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([h2])
    })

    editor.send({
      type: 'update value',
      value: [h1, paragraph, h2],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([h1, paragraph, h2])
    })
  })

  test('Scenario: Clearing lonely block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'image',
          _key: imageKey,
        },
      ],
      schemaDefinition: defineSchema({
        blockObjects: [{name: 'image'}],
      }),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'image',
          _key: imageKey,
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k3',
          children: [
            {
              _type: 'span',
              _key: 'k4',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Clearing lonely text block', async () => {
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
          style: 'h1',
          markDefs: [],
        },
      ],
      schemaDefinition: defineSchema({
        styles: [{name: 'h1'}],
      }),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
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
          style: 'h1',
          markDefs: [],
        },
      ])
    })

    editor.send({
      type: 'update value',
      value: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: 'k4',
          children: [
            {
              _type: 'span',
              _key: 'k5',
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })
  })

  test('Scenario: Updating text while read-only', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ],
      schemaDefinition: defineSchema({}),
    })

    editor.send({
      type: 'update readOnly',
      readOnly: true,
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: Updating text while read-only and having unemitted local changes', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
        },
      ],
    })

    editor.send({type: 'focus'})
    await userEvent.type(locator, 'foo')

    editor.send({type: 'update readOnly', readOnly: true})

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'bar', marks: []}],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'foo', marks: []}],
          style: 'normal',
          markDefs: [],
        },
      ])
    })
  })

  test('Scenario: Updating with unknown block object', async () => {
    const keyGenerator = createTestKeyGenerator()
    const events: Array<EditorEmittedEvent> = []
    const {editor} = await createTestEditor({
      children: (
        <EventListenerPlugin
          on={(event) => {
            events.push(event)
          }}
        />
      ),
      keyGenerator,
    })

    editor.send({
      type: 'update value',
      value: [
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []},
          ],
        },
        {
          _key: keyGenerator(),
          _type: 'image',
        },
        {
          _key: keyGenerator(),
          _type: 'block',
          children: [
            {_type: 'span', _key: keyGenerator(), text: 'bar', marks: []},
          ],
        },
      ],
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo'])
    })

    await vi.waitFor(() => {
      expect(events).toEqual([
        {type: 'ready'},
        expect.objectContaining({
          type: 'invalid value',
        }),
      ])
    })
  })
})

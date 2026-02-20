import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {getSelectionAfterText} from '../src/internal-utils/text-selection'
import {createTestEditor} from '../src/test/vitest'

describe('Selection preservation on remote patches', () => {
  test('Scenario: Whole-block set that only changes style preserves selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Place cursor after "hello"
    await userEvent.click(locator)

    const selection = getSelectionAfterText(
      editor.getSnapshot().context,
      'hello',
    )

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Remote patch: whole-block set that only changes style (children identical)
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}],
          value: {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
            ],
            markDefs: [],
            style: 'h1',
          },
          origin: 'remote',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: spanKey, text: 'hello world', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ],
    })

    await vi.waitFor(() => {
      // Style should be updated
      expect(editor.getSnapshot().context.value?.[0]?.style).toBe('h1')
    })

    // Selection should be preserved
    expect(editor.getSnapshot().context.selection).toEqual(selection)
  })

  test('Scenario: Whole-block set that adds a link annotation preserves selection', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

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
            {_type: 'span', _key: spanKey, text: 'click here', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Place cursor after "click"
    await userEvent.click(locator)

    const selection = getSelectionAfterText(
      editor.getSnapshot().context,
      'click',
    )

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Remote patch: whole-block set that adds a link annotation.
    // Both markDefs and the span's marks change, but children keys are the same.
    const linkKey = 'remote-link'
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}],
          value: {
            _type: 'block',
            _key: blockKey,
            children: [
              {
                _type: 'span',
                _key: spanKey,
                text: 'click here',
                marks: [linkKey],
              },
            ],
            markDefs: [
              {_key: linkKey, _type: 'link', href: 'https://example.com'},
            ],
            style: 'normal',
          },
          origin: 'remote',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {
              _type: 'span',
              _key: spanKey,
              text: 'click here',
              marks: [linkKey],
            },
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
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
              text: 'click here',
              marks: [linkKey],
            },
          ],
          markDefs: [
            {_key: linkKey, _type: 'link', href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ])
    })

    // Selection should be preserved
    expect(editor.getSnapshot().context.selection).toEqual(selection)
  })

  test('Scenario: Whole-block set with changed children text preserves selection when cursor is in unchanged region', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const span1Key = keyGenerator()
    const span2Key = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'hello ', marks: []},
            {
              _type: 'span',
              _key: span2Key,
              text: 'world',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Place cursor after "hello" (in span1, which won't change)
    await userEvent.click(locator)

    const selection = getSelectionAfterText(
      editor.getSnapshot().context,
      'hello',
    )

    editor.send({
      type: 'select',
      at: selection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(selection)
    })

    // Remote patch: whole-block set where span2 text changes but span1 is identical
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}],
          value: {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: span1Key, text: 'hello ', marks: []},
              {
                _type: 'span',
                _key: span2Key,
                text: 'universe',
                marks: ['strong'],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
          origin: 'remote',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: span1Key, text: 'hello ', marks: []},
            {
              _type: 'span',
              _key: span2Key,
              text: 'universe',
              marks: ['strong'],
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
          children: [
            {_type: 'span', _key: span1Key, text: 'hello ', marks: []},
            {
              _type: 'span',
              _key: span2Key,
              text: 'universe',
              marks: ['strong'],
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Selection should be preserved (cursor was in span1 which didn't change)
    expect(editor.getSnapshot().context.selection).toEqual(selection)
  })

  test('Scenario: Whole-block set with identical children preserves selection and allows continued typing', async () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        styles: [{name: 'normal'}, {name: 'h1'}],
      }),
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    // Place cursor after "hello"
    await userEvent.click(locator)

    editor.send({
      type: 'select',
      at: getSelectionAfterText(editor.getSnapshot().context, 'hello'),
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        getSelectionAfterText(editor.getSnapshot().context, 'hello'),
      )
    })

    // Remote patch: whole-block set that only changes style
    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [{_key: blockKey}],
          value: {
            _type: 'block',
            _key: blockKey,
            children: [
              {_type: 'span', _key: spanKey, text: 'hello', marks: []},
            ],
            markDefs: [],
            style: 'h1',
          },
          origin: 'remote',
        },
      ],
      snapshot: [
        {
          _type: 'block',
          _key: blockKey,
          children: [{_type: 'span', _key: spanKey, text: 'hello', marks: []}],
          markDefs: [],
          style: 'h1',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value?.[0]?.style).toBe('h1')
    })

    // User should be able to continue typing after the remote patch
    await userEvent.type(locator, ' world')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_key: spanKey, _type: 'span', text: 'hello world', marks: []},
          ],
          markDefs: [],
          style: 'h1',
        },
      ])
    })
  })
})

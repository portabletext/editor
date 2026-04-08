import {diffMatchPatch, insert, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {whenTheCaretIsPutAfter} from '../test-utils/caret-placement'
import {getSelectionAfterText} from '../test-utils/text-selection'

describe('Feature: Selection adjustment after remote patches', () => {
  test('Scenario: Remote insert block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterBarSelection = await whenTheCaretIsPutAfter(editor, 'bar')

    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()

    editor.send({
      type: 'patches',
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: insertedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: insertedSpanKey,
                  text: 'inserted',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'before',
          [{_key: b1}],
        ),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: insertedBlockKey,
          children: [
            {_type: 'span', _key: insertedSpanKey, text: 'inserted', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterBarSelection)
    })
  })

  test('Scenario: Remote insert block after cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterFooSelection = await whenTheCaretIsPutAfter(editor, 'foo')

    const insertedBlockKey = keyGenerator()
    const insertedSpanKey = keyGenerator()

    editor.send({
      type: 'patches',
      patches: [
        insert(
          [
            {
              _type: 'block',
              _key: insertedBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: insertedSpanKey,
                  text: 'inserted',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'after',
          [{_key: b2}],
        ),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: insertedBlockKey,
          children: [
            {_type: 'span', _key: insertedSpanKey, text: 'inserted', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })
  })

  test('Scenario: Remote text edit in another block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterFooSelection = await whenTheCaretIsPutAfter(editor, 'foo')

    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('bar', 'baz', [
          {_key: b2},
          'children',
          {_key: s2},
          'text',
        ]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterFooSelection)
    })
  })

  test('Scenario: Remote delete of block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()
    const b3 = keyGenerator()
    const s3 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'aaa', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'bbb', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b3,
        children: [{_type: 'span', _key: s3, text: 'ccc', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    const afterCccSelection = await whenTheCaretIsPutAfter(editor, 'ccc')

    editor.send({
      type: 'patches',
      patches: [unset([{_key: b1}])],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bbb', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b3,
          children: [{_type: 'span', _key: s3, text: 'ccc', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(afterCccSelection)
    })
  })

  test('Scenario: Remote insert text in same block before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'helloworld', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'helloworld')

    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('helloworld', 'hello world', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['hello world'])
    })

    await vi.waitFor(() => {
      const adjustedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'hello world',
      )
      expect(editor.getSnapshot().context.selection).toEqual(adjustedSelection)
    })
  })

  test('Scenario: Remote insert span before cursor in same block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'hello', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue,
    })

    await userEvent.click(locator)
    const afterHelloSelection = await whenTheCaretIsPutAfter(editor, 'hello')

    const newSpanKey = keyGenerator()

    editor.send({
      type: 'patches',
      patches: [
        insert(
          [
            {
              _type: 'span',
              _key: newSpanKey,
              text: 'world',
              marks: ['strong'],
            },
          ],
          'before',
          [{_key: b1}, 'children', {_key: s1}],
        ),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['world,hello'])
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        afterHelloSelection,
      )
    })
  })

  test('Scenario: Remote split of block where cursor is', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foobar', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobar')

    const newBlockKey = keyGenerator()
    const newSpanKey = keyGenerator()

    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('foobar', 'foo', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        insert(
          [
            {
              _type: 'block',
              _key: newBlockKey,
              children: [
                {
                  _type: 'span',
                  _key: newSpanKey,
                  text: 'bar',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'after',
          [{_key: b1}],
        ),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(getTersePt(editor.getSnapshot().context)).toEqual(['foo', 'bar'])
    })

    await vi.waitFor(() => {
      const adjustedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foo',
      )
      expect(editor.getSnapshot().context.selection).toEqual(adjustedSelection)
    })
  })

  test('Scenario: Remote unset of span before cursor', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: s1, text: 'foo', marks: ['strong']},
          {_type: 'span', _key: s2, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
    })

    await userEvent.click(locator)
    const afterBarSelection = await whenTheCaretIsPutAfter(editor, 'bar')

    editor.send({
      type: 'patches',
      patches: [unset([{_key: b1}, 'children', {_key: s1}])],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
      expect(editor.getSnapshot().context.selection).toEqual(afterBarSelection)
    })
  })

  test('Scenario: Remote mark on text preserves cursor position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [{_type: 'span', _key: s1, text: 'foobarbaz', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({
        decorators: [{name: 'strong'}],
      }),
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobarbaz')

    const newSpanFoo = keyGenerator()
    const newSpanBar = keyGenerator()
    const newSpanBaz = keyGenerator()

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: newSpanFoo, text: 'foo', marks: []},
            {
              _type: 'span',
              _key: newSpanBar,
              text: 'bar',
              marks: ['strong'],
            },
            {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
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
          _key: b1,
          children: [
            {_type: 'span', _key: newSpanFoo, text: 'foo', marks: []},
            {
              _type: 'span',
              _key: newSpanBar,
              text: 'bar',
              marks: ['strong'],
            },
            {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'baz',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })
})

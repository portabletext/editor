import {diffMatchPatch, insert, set, unset} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {createTestEditor} from '../src/test/vitest'
import {whenTheCaretIsPutAfter} from '../test-utils/caret-placement'
import {getSelectionAfterText} from '../test-utils/text-selection'
import {toTextspec} from '../test-utils/to-textspec'

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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: hello world|',
      )
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        'B: [strong:world]hello|',
      )
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(
        afterHelloSelection,
      )
    })
  })

  test('Scenario: Remote split with the caret in the moved tail follows the content into the new block', async () => {
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: bar|'].join('\n'),
      )
    })

    await vi.waitFor(() => {
      const adjustedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'bar',
      )
      expect(editor.getSnapshot().context.selection).toEqual(adjustedSelection)
    })
  })

  test('Scenario: Remote multi-span block split keeps a caret in a moved flanking span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const s2 = keyGenerator()
    const s3 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: s1, text: 'foo ', marks: []},
          {_type: 'span', _key: s2, text: 'bar', marks: ['strong']},
          {_type: 'span', _key: s3, text: ' baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue,
    })

    await userEvent.click(locator)

    // The local caret sits inside the third span, unrelated to where the
    // remote split below happens (offset 2 of the first span): between
    // the leading space and "az".
    const localSelection = {
      anchor: {path: [{_key: b1}, 'children', {_key: s3}], offset: 2},
      focus: {path: [{_key: b1}, 'children', {_key: s3}], offset: 2},
      backward: false,
    }
    editor.send({type: 'select', at: localSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(localSelection)
    })

    const newBlockKey = keyGenerator()

    // What a collaborator's editor emits when they press Enter at offset 2
    // of the first span (between "fo" and "o "): the split truncates the
    // first span in place, unsets the fully-consumed middle span, empties
    // then unsets the fully-consumed last span, and inserts the tail block
    // whose children reuse all three original span keys.
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('foo ', 'fo', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        unset([{_key: b1}, 'children', {_key: s2}]),
        diffMatchPatch(' baz', '', [
          {_key: b1},
          'children',
          {_key: s3},
          'text',
        ]),
        insert(
          [
            {
              _type: 'block',
              _key: newBlockKey,
              children: [
                {_type: 'span', _key: s1, text: 'o ', marks: []},
                {_type: 'span', _key: s2, text: 'bar', marks: ['strong']},
                {_type: 'span', _key: s3, text: ' baz', marks: []},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          'after',
          [{_key: b1}],
        ),
        unset([{_key: b1}, 'children', {_key: s3}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'fo', marks: []}],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: newBlockKey,
          children: [
            {_type: 'span', _key: s1, text: 'o ', marks: []},
            {_type: 'span', _key: s2, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: s3, text: ' baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The third span moved into the new block with its key and text
    // intact, so the caret follows it there at the same offset, instead of
    // dying with the head block's now-empty leftover node.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: newBlockKey}, 'children', {_key: s3}],
          offset: 2,
        },
        focus: {path: [{_key: newBlockKey}, 'children', {_key: s3}], offset: 2},
        backward: false,
      })
    })
  })

  test('Scenario: Remote span merge keeps the caret at its text position', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: s1, text: 'foo', marks: []},
          {_type: 'span', _key: s2, text: 'bar', marks: ['strong']},
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
    await whenTheCaretIsPutAfter(editor, 'b')

    // What a collaborator's editor emits when they unbold "bar": the mark
    // change, then their normalizer's span merge as a text patch on the
    // surviving span plus an unset of the absorbed one.
    editor.send({
      type: 'patches',
      patches: [
        set([], [{_key: b1}, 'children', {_key: s2}, 'marks']),
        diffMatchPatch('foo', 'foobar', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        unset([{_key: b1}, 'children', {_key: s2}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The block's text is unchanged by the merge, so the caret belongs at
    // the same text position: after "foob", not at the end of the merged
    // span.
    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foob',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote block merge keeps the caret in its span', async () => {
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
    await whenTheCaretIsPutAfter(editor, 'b')

    // What a collaborator's editor emits when they press Backspace at the
    // start of the second block: the block merge moves the children (keys
    // intact) into the previous block and unsets the emptied block.
    editor.send({
      type: 'patches',
      patches: [
        insert([{_type: 'span', _key: s2, text: 'bar', marks: []}], 'after', [
          {_key: b1},
          'children',
          {_key: s1},
        ]),
        unset([{_key: b2}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: s1, text: 'foo', marks: []},
            {_type: 'span', _key: s2, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The caret's span survived the move with its key intact, so the caret
    // belongs where it was: inside that span, after the "b".
    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'b',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote block merge followed by span merge keeps the caret at its text position', async () => {
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
    await whenTheCaretIsPutAfter(editor, 'b')

    // What a collaborator's editor emits when they press Backspace at the
    // start of the second block and the spans carry the same marks: the
    // block merge moves the span into the previous block, then their
    // normalizer merges the now-adjacent same-marked spans, absorbing the
    // moved span into the first one.
    editor.send({
      type: 'patches',
      patches: [
        insert([{_type: 'span', _key: s2, text: 'bar', marks: []}], 'after', [
          {_key: b1},
          'children',
          {_key: s1},
        ]),
        unset([{_key: b2}]),
        diffMatchPatch('foo', 'foobar', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        unset([{_key: b1}, 'children', {_key: s2}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foobar', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The merged block's text is the concatenation of the two blocks'
    // texts, so the caret's character position maps exactly: after "foob".
    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'foob',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote split before the caret moves the caret into the new block', async () => {
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
    await whenTheCaretIsPutAfter(editor, 'foob')

    const newBlockKey = keyGenerator()

    // What a collaborator's editor emits when they press Enter between
    // "foo" and "bar": the original span is truncated to the first half
    // and the second half moves to a new block. The split reuses the
    // span's `_key` in the new block.
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
              children: [{_type: 'span', _key: s1, text: 'bar', marks: []}],
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
      expect(toTextspec(editor.getSnapshot().context)).toEqual(
        ['B: foo', 'B: b|ar'].join('\n'),
      )
    })

    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'b',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
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

  test('Scenario: Remote mark toggle with re-keyed spans preserves the caret', async () => {
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
            {_type: 'span', _key: newSpanBar, text: 'bar', marks: ['strong']},
            {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value[0]).toEqual({
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: newSpanFoo, text: 'foo', marks: []},
          {_type: 'span', _key: newSpanBar, text: 'bar', marks: ['strong']},
          {_type: 'span', _key: newSpanBaz, text: 'baz', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      })
    })

    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'baz',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote children replacement with different text keeps the current fallback', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: defineSchema({decorators: [{name: 'strong'}]}),
      initialValue: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: s1, text: 'foobarbaz', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'foobarbaz')

    const newSpan = keyGenerator()

    editor.send({
      type: 'update value',
      value: [
        {
          _type: 'block',
          _key: b1,
          children: [{_type: 'span', _key: newSpan, text: 'hello', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ],
    })

    await vi.waitFor(() => {
      const children = (
        editor.getSnapshot().context.value[0] as {
          children: Array<{text?: string}>
        }
      ).children
      expect(children[0]?.text).toBe('hello')
    })

    // Text changed, so offset mapping would be guesswork; the selection
    // keeps the pre-existing fallback (start of the replaced children).
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path).toEqual([
        {_key: b1},
        'children',
        {_key: newSpan},
      ])
      expect(selection?.focus.offset).toBe(0)
    })
  })

  test('Scenario: An unrelated identical delete and insert in different blocks never moves the caret', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    const s1 = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: s1, text: 'hello cat world', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'goodbye ', marks: []}],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'hello cat')

    // Deletes "cat" from block 1's span. Unrelated, someone else types the
    // same word into block 2's existing span in the same batch.
    editor.send({
      type: 'patches',
      patches: [
        diffMatchPatch('hello cat world', 'hello  world', [
          {_key: b1},
          'children',
          {_key: s1},
          'text',
        ]),
        diffMatchPatch('goodbye ', 'goodbye cat', [
          {_key: b2},
          'children',
          {_key: s2},
          'text',
        ]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: s1, text: 'hello  world', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'goodbye cat', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Deleting "cat" from block 1 and typing "cat" into block 2 is a
    // coincidence, not a move: the caret that sat inside the deleted "cat"
    // stays in block 1, collapsed to where the deletion happened, and never
    // follows the identical text into block 2.
    await vi.waitFor(() => {
      const selection = editor.getSnapshot().context.selection
      expect(selection?.focus.path).toEqual([
        {_key: b1},
        'children',
        {_key: s1},
      ])
      expect(selection?.focus.offset).toBe('hello '.length)
    })
  })

  test('Scenario: Remote block delete never follows a duplicate span key across the document', async () => {
    const keyGenerator = createTestKeyGenerator()
    const b1 = keyGenerator()
    // Splitting a block reuses the span `_key` in the new block, so real
    // documents contain doc-wide duplicate span keys. The caret's span key
    // existing elsewhere must never make the caret jump there.
    const duplicateSpanKey = keyGenerator()
    const b2 = keyGenerator()
    const s2 = keyGenerator()
    const b3 = keyGenerator()

    const initialValue = [
      {
        _type: 'block',
        _key: b1,
        children: [
          {_type: 'span', _key: duplicateSpanKey, text: 'foo', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b2,
        children: [{_type: 'span', _key: s2, text: 'mid', marks: []}],
        markDefs: [],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: b3,
        children: [
          {_type: 'span', _key: duplicateSpanKey, text: 'bar', marks: []},
        ],
        markDefs: [],
        style: 'normal',
      },
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    await userEvent.click(locator)
    await whenTheCaretIsPutAfter(editor, 'b')

    editor.send({
      type: 'patches',
      patches: [unset([{_key: b3}])],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: duplicateSpanKey, text: 'foo', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
        {
          _type: 'block',
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'mid', marks: []}],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // The deleted block's content is gone (not merged anywhere), so no
    // exact mapping exists and the generic fallback stands: the caret
    // collapses into the adjacent block, never onto the same-keyed span
    // in the first block.
    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'mid',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: Remote block reorder keeps the caret in its span', async () => {
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
    await whenTheCaretIsPutAfter(editor, 'fo')

    // What a collaborator's editor emits when they move the first block
    // below the second: the block is unset from its old position and
    // reinserted, key and children intact, after the second block.
    editor.send({
      type: 'patches',
      patches: [
        unset([{_key: b1}]),
        insert(
          [
            {
              _type: 'block',
              _key: b1,
              children: [{_type: 'span', _key: s1, text: 'foo', marks: []}],
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
          _key: b2,
          children: [{_type: 'span', _key: s2, text: 'bar', marks: []}],
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
      ])
    })

    // The block reappeared with its own key and its span's key both
    // intact, so the caret stays inside that span at the same offset
    // instead of collapsing to a boundary when the unset nulls it.
    await vi.waitFor(() => {
      const expectedSelection = getSelectionAfterText(
        editor.getSnapshot().context,
        'fo',
      )
      expect(editor.getSnapshot().context.selection).toEqual(expectedSelection)
    })
  })

  test('Scenario: An expanded backward selection crossing a remote block merge keeps backward', async () => {
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

    // A backward selection: the anchor sits later in the document (the
    // end of block 2's "bar") than the focus (the start of block 1's
    // "foo"), spanning across the block boundary the merge below erases.
    const initialSelection = {
      anchor: {path: [{_key: b2}, 'children', {_key: s2}], offset: 3},
      focus: {path: [{_key: b1}, 'children', {_key: s1}], offset: 0},
      backward: true,
    }
    editor.send({type: 'select', at: initialSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
    })

    // What a collaborator's editor emits when they press Backspace at the
    // start of the second block: the block merge moves the children (keys
    // intact) into the previous block and unsets the emptied block.
    editor.send({
      type: 'patches',
      patches: [
        insert([{_type: 'span', _key: s2, text: 'bar', marks: []}], 'after', [
          {_key: b1},
          'children',
          {_key: s1},
        ]),
        unset([{_key: b2}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: s1, text: 'foo', marks: []},
            {_type: 'span', _key: s2, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    // Both spans survived the merge with their keys intact, so both ends
    // of the selection follow to their same offsets in the merged block,
    // and the anchor still sits after the focus: the selection stays
    // backward.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [{_key: b1}, 'children', {_key: s2}], offset: 3},
        focus: {path: [{_key: b1}, 'children', {_key: s1}], offset: 0},
        backward: true,
      })
    })
  })

  test('Scenario: remote patches run no selection recovery when there is no pre-existing selection', async () => {
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

    const {editor} = await createTestEditor({
      keyGenerator,
      initialValue,
    })

    // No click, so there is no pre-existing selection for recovery to work
    // from.
    expect(editor.getSnapshot().context.selection).toBeNull()

    // The same block-merge shape the recovery feature exists for: without
    // a pre-apply selection, `interpretTransaction` never runs and
    // recovery has nothing to apply.
    editor.send({
      type: 'patches',
      patches: [
        insert([{_type: 'span', _key: s2, text: 'bar', marks: []}], 'after', [
          {_key: b1},
          'children',
          {_key: s1},
        ]),
        unset([{_key: b2}]),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'block',
          _key: b1,
          children: [
            {_type: 'span', _key: s1, text: 'foo', marks: []},
            {_type: 'span', _key: s2, text: 'bar', marks: []},
          ],
          markDefs: [],
          style: 'normal',
        },
      ])
    })

    expect(editor.getSnapshot().context.selection).toBeNull()
  })
})

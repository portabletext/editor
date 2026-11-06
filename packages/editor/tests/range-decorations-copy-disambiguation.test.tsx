import {diffMatchPatch} from '@portabletext/patches'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {createTestEditor} from '../src/test/vitest'

describe('Range decoration copy disambiguation', () => {
  test('Scenario: remote text copied from a later block into an unrelated earlier block stays in the source block', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [block('b0', 's0', 'hello'), block('b1', 's1', 'foo bar')],
    })
    const registration = editor.registerDecorations({
      decorations: [decoration(selection('b1', 's1', 0, 'b1', 's1', 7))],
    })

    editor.send({
      type: 'patches',
      patches: [
        textPatch('b1', 's1', 'foo bar', 'bar'),
        textPatch('b0', 's0', 'hello', 'foo hello'),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([
        {
          id: 'decoration',
          range: selection('b1', 's1', 0, 'b1', 's1', 3),
        },
      ])
    })
  })

  test('Scenario: remote text copied from an earlier block into an unrelated later block stays in the source block', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [block('b0', 's0', 'foo bar'), block('b1', 's1', 'hello')],
    })
    const registration = editor.registerDecorations({
      decorations: [decoration(selection('b0', 's0', 0, 'b0', 's0', 7))],
    })

    editor.send({
      type: 'patches',
      patches: [
        textPatch('b0', 's0', 'foo bar', 'foo '),
        textPatch('b1', 's1', 'hello', 'hello bar'),
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([
        {
          id: 'decoration',
          range: selection('b0', 's0', 0, 'b0', 's0', 4),
        },
      ])
    })
  })

  test('Scenario: a fresh-key block reinserted away from the removed block does not capture its decoration', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [
        block('b0', 's0', 'hello'),
        block('b1', 's1', 'foo'),
        block('b2', 's2', 'bye'),
      ],
    })
    const registration = editor.registerDecorations({
      decorations: [decoration(selection('b1', 's1', 0, 'b1', 's1', 3))],
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', path: [{_key: 'b1'}], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'b2'}],
          position: 'after',
          items: [block('n2', 'm2', 'foo')],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([])
    })
  })

  test('Scenario: two fresh-key block copies do not capture a removed block decoration', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      initialValue: [
        block('b0', 's0', 'hello'),
        block('b1', 's1', 'foo'),
        block('b2', 's2', 'bye'),
      ],
    })
    const registration = editor.registerDecorations({
      decorations: [decoration(selection('b1', 's1', 0, 'b1', 's1', 3))],
    })

    editor.send({
      type: 'patches',
      patches: [
        {type: 'unset', path: [{_key: 'b1'}], origin: 'remote'},
        {
          type: 'insert',
          path: [{_key: 'b0'}],
          position: 'after',
          items: [block('n1', 'm1', 'foo')],
          origin: 'remote',
        },
        {
          type: 'insert',
          path: [{_key: 'b2'}],
          position: 'after',
          items: [block('n2', 'm2', 'foo')],
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      expect(registration.getDecorations()).toEqual([])
    })
  })
})

function block(blockKey: string, spanKey: string, text: string) {
  return {
    _type: 'block',
    _key: blockKey,
    style: 'normal',
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}

function selection(
  anchorBlockKey: string,
  anchorSpanKey: string,
  anchorOffset: number,
  focusBlockKey: string,
  focusSpanKey: string,
  focusOffset: number,
) {
  return {
    anchor: {
      path: [
        {_key: anchorBlockKey},
        'children' as const,
        {_key: anchorSpanKey},
      ],
      offset: anchorOffset,
    },
    focus: {
      path: [{_key: focusBlockKey}, 'children' as const, {_key: focusSpanKey}],
      offset: focusOffset,
    },
  }
}

function decoration(range: ReturnType<typeof selection>) {
  return {
    id: 'decoration',
    type: 'range' as const,
    render: (props: {children: React.ReactNode}) => (
      <span>{props.children}</span>
    ),
    range,
  }
}

function textPatch(
  blockKey: string,
  spanKey: string,
  before: string,
  after: string,
) {
  return diffMatchPatch(before, after, [
    {_key: blockKey},
    'children',
    {_key: spanKey},
    'text',
  ])
}

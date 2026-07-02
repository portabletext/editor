import {describe, expect, test} from 'vitest'
import {defineSchema, type EditorSnapshot} from '../src'
import {createTestEditor} from '../src/test/vitest'

const initialValue = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'line one', marks: []}],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's2', text: 'line two', marks: []}],
  },
]

function withCaret(
  snapshot: EditorSnapshot,
  blockKey: string,
  spanKey: string,
  offset: number,
): EditorSnapshot {
  const point = {
    path: [{_key: blockKey}, 'children', {_key: spanKey}],
    offset,
  }
  return {
    ...snapshot,
    context: {...snapshot.context, selection: {anchor: point, focus: point}},
  }
}

describe('editor.dom.getPointAtCoordinates', () => {
  test('round-trips with getSelectionRect (pixels back to the same point)', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    const snapshot = editor.getSnapshot()

    const rect = editor.dom.getSelectionRect(withCaret(snapshot, 'b2', 's2', 3))
    expect(rect).not.toBeNull()

    const point = editor.dom.getPointAtCoordinates({
      x: rect!.left,
      y: rect!.top + rect!.height / 2,
    })

    expect(point).toEqual({
      path: [{_key: 'b2'}, 'children', {_key: 's2'}],
      offset: 3,
    })
  })

  test('returns null for coordinates outside the editor', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    expect(editor.dom.getPointAtCoordinates({x: -1000, y: -1000})).toBeNull()
  })
})

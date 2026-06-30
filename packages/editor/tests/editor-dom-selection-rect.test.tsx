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
): EditorSnapshot {
  const point = {
    path: [{_key: blockKey}, 'children', {_key: spanKey}],
    offset: 0,
  }
  return {
    ...snapshot,
    context: {...snapshot.context, selection: {anchor: point, focus: point}},
  }
}

describe('editor.dom.getSelectionRect', () => {
  test("returns a rect for the snapshot's selection, lower for a lower block", async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    const snapshot = editor.getSnapshot()

    const rectTop = editor.dom.getSelectionRect(withCaret(snapshot, 'b1', 's1'))
    const rectBottom = editor.dom.getSelectionRect(
      withCaret(snapshot, 'b2', 's2'),
    )

    expect(rectTop).not.toBeNull()
    expect(rectBottom).not.toBeNull()
    expect(Number.isFinite(rectTop!.top)).toBe(true)
    // b2 sits below b1, so its caret rect is lower on the page.
    expect(rectBottom!.top).toBeGreaterThan(rectTop!.top)
  })

  test('returns null when the snapshot has no selection', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })
    const snapshot = editor.getSnapshot()

    expect(
      editor.dom.getSelectionRect({
        ...snapshot,
        context: {...snapshot.context, selection: null},
      }),
    ).toBeNull()
  })

  test('returns null when the selection does not resolve', async () => {
    const {editor} = await createTestEditor({
      schemaDefinition: defineSchema({}),
      initialValue,
    })

    expect(
      editor.dom.getSelectionRect(
        withCaret(editor.getSnapshot(), 'does-not-exist', 'x'),
      ),
    ).toBeNull()
  })
})

import {createTestEditor} from '@portabletext/editor/test/vitest'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'

// A schema without `strong`. The value below still uses it, the situation
// after removing a decorator from a schema with existing documents.
const schemaDefinition = defineSchema({
  decorators: [{name: 'em'}],
  annotations: [{name: 'link', fields: [{name: 'url', type: 'string'}]}],
})

const initialValue = [
  {
    _type: 'block',
    _key: 'b0',
    style: 'normal',
    markDefs: [],
    children: [
      {_type: 'span', _key: 's0', text: 'heading with ', marks: []},
      {_type: 'span', _key: 's1', text: 'bold', marks: ['strong']},
      {_type: 'span', _key: 's2', text: ' text', marks: []},
    ],
  },
  {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's3', text: 'plain paragraph', marks: []}],
  },
]

describe('Feature: Schema-Less Decorator Marks', () => {
  test('Scenario: marks unknown to the schema survive the round-trip', async () => {
    const consoleWarn = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined)
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
    })

    // The editor must not change the value: the `strong` mark stays, the
    // three spans stay separate. Unknown `style` and `listItem` values
    // already pass through untouched; marks work the same way.
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    // The mark renders without effect, silently: reporting is the host's
    // job, so the console stays clean.
    expect(consoleWarn).not.toHaveBeenCalled()
    consoleWarn.mockRestore()
  })

  test('Scenario: editing one block leaves blocks with unknown marks untouched', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual(initialValue)
    })

    const patches: Array<{path?: unknown; value?: unknown}> = []
    editor.on('mutation', (event) => {
      patches.push(
        ...(event.patches as Array<{path?: unknown; value?: unknown}>),
      )
    })

    // Type at the end of the second block, away from the block with the
    // unknown mark.
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
          offset: 'plain paragraph'.length,
        },
        focus: {
          path: [{_key: 'b1'}, 'children', {_key: 's3'}],
          offset: 'plain paragraph'.length,
        },
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      expect(
        editor
          .getSnapshot()
          .context.value?.find((block) => block._key === 'b1'),
      ).toEqual({
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        markDefs: [],
        children: [
          {_type: 'span', _key: 's3', text: 'plain paragraph!', marks: []},
        ],
      })
    })

    // The block with the unknown mark is unchanged and no patch touched
    // it. Writing "fixes" back to blocks the user didn't edit is what
    // corrupted documents (merged spans, dropped marks, duplicated text).
    expect(
      editor.getSnapshot().context.value?.find((block) => block._key === 'b0'),
    ).toEqual(initialValue[0])
    const patchesTouchingUntouchedBlock = patches.filter(
      (patch) =>
        Array.isArray(patch.path) &&
        patch.path.some(
          (segment) =>
            typeof segment === 'object' &&
            segment !== null &&
            '_key' in segment &&
            segment._key === 'b0',
        ),
    )
    expect(patchesTouchingUntouchedBlock).toEqual([])
  })
})

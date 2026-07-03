import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineSchema} from '../src'
import {raise} from '../src/behaviors/behavior.types.action'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {safeParse} from '../src/internal-utils/safe-json'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'

const fragmentBlock = {
  _type: 'block',
  _key: 'f0',
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: 'fs0', text: 'FRAG', marks: []}],
}

/**
 * Re-raises copies with a `fragment` override whose content exists nowhere
 * in the document, the way the table plugin re-raises rectangle copies with
 * a sliced table. No `at` is given: the range defaults to the fragment's
 * full span.
 */
const copyFragmentInstead = defineBehavior({
  on: 'serialize',
  guard: ({event}) => event.fragment === undefined,
  actions: [
    ({event}) => [
      raise({
        ...event,
        fragment: [fragmentBlock],
      }),
    ],
  ],
})

/**
 * Re-raises copies with an `at` override: a different range of the same
 * document, the way drag serialization carries the grabbed selection.
 */
const copyMiddleCharacterInstead = defineBehavior({
  on: 'serialize',
  guard: ({event}) => event.at === undefined,
  actions: [
    ({event}) => [
      raise({
        ...event,
        at: {
          anchor: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 1},
          focus: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 2},
        },
      }),
    ],
  ],
})

describe('event.serialize', () => {
  test('Scenario: an at override serializes that range, not the selection', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: 'd0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'ds0', text: 'DOC', marks: []}],
        },
      ],
      children: <BehaviorPlugin behaviors={[copyMiddleCharacterInstead]} />,
    })

    const documentSelection = {
      anchor: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 0},
      focus: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 3},
    }
    editor.send({type: 'select', at: documentSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(3)
    })

    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: documentSelection},
    })

    await vi.waitFor(() => {
      expect(dataTransfer.getData('text/plain')).toBe('O')
    })
  })

  test('Scenario: a fragment override serializes the fragment, not the document', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: defineSchema({}),
      initialValue: [
        {
          _type: 'block',
          _key: 'd0',
          style: 'normal',
          markDefs: [],
          children: [{_type: 'span', _key: 'ds0', text: 'DOC', marks: []}],
        },
      ],
      children: <BehaviorPlugin behaviors={[copyFragmentInstead]} />,
    })

    const documentSelection = {
      anchor: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 0},
      focus: {path: [{_key: 'd0'}, 'children', {_key: 'ds0'}], offset: 3},
    }
    editor.send({type: 'select', at: documentSelection})
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection?.focus.offset).toBe(3)
    })

    const dataTransfer = new DataTransfer()
    editor.send({
      type: 'clipboard.copy',
      originEvent: {dataTransfer},
      position: {selection: documentSelection},
    })

    await vi.waitFor(() => {
      expect(
        safeParse(dataTransfer.getData('application/x-portable-text')),
      ).toEqual([fragmentBlock])
      expect(dataTransfer.getData('text/plain')).toBe('FRAG')
    })
  })
})

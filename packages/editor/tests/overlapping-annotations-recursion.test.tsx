import {isTextBlock, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi, afterEach} from 'vitest'
import type {EditorSelection} from '../src'
import {defineBehavior} from '../src/behaviors/behavior.types.behavior'
import {BehaviorPlugin} from '../src/plugins/plugin.behavior'
import {createTestEditor} from '../src/test/vitest'
import {getTextMarks} from '../test-utils/text-marks'

/**
 * Regression tests for an unbounded recursion in the
 * `preventOverlappingAnnotations` Core Behavior.
 *
 * The Behavior raises `annotation.remove` followed by the original
 * `annotation.add` whenever its guard considers the annotation active. If the
 * guard and the `annotation.remove` operation disagree on the effective
 * selection (stale `at` paths, or a selection that only touches an annotated
 * span at a zero-width boundary), the remove never strips anything, the guard
 * keeps answering "active", and the raise chain recurses until the call stack
 * overflows, leaving the editor blank.
 */

const RAISE_LIMIT = 20

async function runScenario(
  makeAt: (keys: {
    blockKey: string
    spanAKey: string
    spanBKey: string
  }) => NonNullable<EditorSelection>,
  options?: {annotatedSpan: 'first' | 'second'},
) {
  const consoleErrors: Array<string> = []
  const errorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args: Array<unknown>) => {
      consoleErrors.push(
        args
          .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
          .join(' '),
      )
    })

  const keyGenerator = createTestKeyGenerator()
  const blockKey = keyGenerator()
  const spanAKey = keyGenerator()
  const spanBKey = keyGenerator()
  const linkKey = keyGenerator()

  let addRaises = 0

  const {editor} = await createTestEditor({
    keyGenerator,
    children: (
      <BehaviorPlugin
        behaviors={[
          defineBehavior({
            on: 'annotation.add',
            guard: () => {
              addRaises++
              return addRaises > RAISE_LIMIT
            },
            // Consume the event to break out of a runaway raise loop so a
            // regression fails fast instead of grinding toward an actual
            // stack overflow
            actions: [() => []],
          }),
        ]}
      />
    ),
    schemaDefinition: defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    }),
    initialValue: [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {
            _type: 'span',
            _key: spanAKey,
            text: 'The quick ',
            marks: options?.annotatedSpan === 'first' ? [linkKey] : [],
          },
          {
            _type: 'span',
            _key: spanBKey,
            text: 'brown fox jumps',
            marks: options?.annotatedSpan === 'first' ? [] : [linkKey],
          },
        ],
        markDefs: [{_key: linkKey, _type: 'link', href: 'https://a.example'}],
        style: 'normal',
      },
    ],
  })

  editor.send({
    type: 'annotation.add',
    at: makeAt({blockKey, spanAKey, spanBKey}),
    annotation: {
      name: 'link',
      value: {href: 'https://b.example'},
    },
  })

  errorSpy.mockRestore()

  return {editor, addRaises, consoleErrors, keys: {linkKey}}
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('preventOverlappingAnnotations recursion', () => {
  test('`at` focus pointing at a removed span while a link exists later in the block', async () => {
    const {editor, addRaises, consoleErrors, keys} = await runScenario(
      ({blockKey, spanAKey}) => ({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanAKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: 'removed-span-key'}],
          offset: 5,
        },
      }),
    )

    expect(addRaises).toBeLessThanOrEqual(RAISE_LIMIT)
    expect(consoleErrors).toEqual([])

    // The pre-existing link survives untouched
    expect(
      getTextMarks(editor.getSnapshot().context, 'brown fox jumps'),
    ).toEqual([keys.linkKey])
  })

  test('`at` anchor touching the end of an annotated span', async () => {
    const {editor, addRaises, consoleErrors, keys} = await runScenario(
      ({blockKey, spanAKey, spanBKey}) => ({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanAKey}],
          offset: 'The quick '.length,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBKey}],
          offset: 'brown'.length,
        },
      }),
      {annotatedSpan: 'first'},
    )

    expect(addRaises).toBeLessThanOrEqual(RAISE_LIMIT)
    expect(consoleErrors).toEqual([])

    const context = editor.getSnapshot().context

    // The existing link only touched at its end boundary survives untouched
    expect(getTextMarks(context, 'The quick ')).toEqual([keys.linkKey])

    // The new link is applied to the selected text
    const newLinkMarks = getTextMarks(context, 'brown')
    expect(newLinkMarks).toHaveLength(1)
    expect(newLinkMarks).not.toEqual([keys.linkKey])

    const block = context.value.at(0)
    if (!isTextBlock(context, block)) {
      throw new Error('Block is not a text block')
    }
    expect(block.markDefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({_type: 'link', href: 'https://a.example'}),
        expect.objectContaining({_type: 'link', href: 'https://b.example'}),
      ]),
    )
  })

  test('`at` focus touching the start of an annotated span', async () => {
    const {editor, addRaises, consoleErrors, keys} = await runScenario(
      ({blockKey, spanAKey, spanBKey}) => ({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanAKey}],
          offset: 2,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanBKey}],
          offset: 0,
        },
      }),
    )

    expect(addRaises).toBeLessThanOrEqual(RAISE_LIMIT)
    expect(consoleErrors).toEqual([])

    const context = editor.getSnapshot().context

    // The existing link only touched at its start boundary survives untouched
    expect(getTextMarks(context, 'brown fox jumps')).toEqual([keys.linkKey])

    // The new link is applied to the selected text
    const newLinkMarks = getTextMarks(context, 'e quick ')
    expect(newLinkMarks).toHaveLength(1)
    expect(newLinkMarks).not.toEqual([keys.linkKey])
  })
})

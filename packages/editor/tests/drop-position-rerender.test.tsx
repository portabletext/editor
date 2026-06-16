import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import type {EditorSelection, Path} from '../src'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({})

/**
 * A `dragover` tick sets the editor-wide drop position. It must not re-render
 * the block tree: only the indicator at the hovered block appears, and no
 * block's content render runs. Pins that the drop position is delivered per
 * block (via the drop-position store), not as a `renderElement` dependency
 * that hands Slate a new render function every tick and re-renders everything.
 */
describe('drop position re-renders', () => {
  test('a dragover shows the indicator without re-rendering any block', async () => {
    const renders: Array<string> = []

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        block('b0', 'first'),
        block('b1', 'second'),
        block('b2', 'third'),
        block('b3', 'fourth'),
      ],
      editableProps: {
        renderBlock: (props) => {
          renders.push((props.value as PortableTextBlock)._key)
          return <div>{props.children}</div>
        },
      },
    })

    await vi.waitFor(() => {
      if (renders.length === 0) {
        throw new Error('not rendered yet')
      }
    })
    renders.length = 0

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )

    // The drag is tracked and the indicator is painted on the hovered block.
    await vi.waitFor(() => {
      if (document.querySelectorAll('.pt-drop-indicator').length !== 1) {
        throw new Error('drop indicator not shown yet')
      }
    })

    // No block's content re-rendered to get there. Before the per-block
    // delivery, every block re-rendered on the tick: `renders` would hold
    // every key.
    expect(renders).toEqual([])
  })
})

function dragover(options: {
  dragOrigin: NonNullable<EditorSelection>
  over: NonNullable<EditorSelection>
  block: 'start' | 'end'
}) {
  return {
    type: 'drag.dragover' as const,
    originEvent: {dataTransfer: new DataTransfer()},
    dragOrigin: {selection: options.dragOrigin},
    position: {
      block: options.block,
      isEditor: false,
      isContainer: false,
      selection: options.over,
    },
  }
}

function block(key: string, text: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    children: [{_type: 'span', _key: `${key}-span`, text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function spanPath(blockKey: string): Path {
  return [{_key: blockKey}, 'children', {_key: `${blockKey}-span`}]
}

function blockSelection(blockKey: string): NonNullable<EditorSelection> {
  return {
    anchor: {path: spanPath(blockKey), offset: 0},
    focus: {path: spanPath(blockKey), offset: 5},
  }
}

function caretIn(blockKey: string): NonNullable<EditorSelection> {
  return {
    anchor: {path: spanPath(blockKey), offset: 0},
    focus: {path: spanPath(blockKey), offset: 0},
  }
}

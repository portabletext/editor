import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineTextBlock, type EditorSelection, type Path} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({})

/**
 * A `dragover` tick must not re-render the block tree: no block's content
 * render runs. The engine draws no drop chrome and keeps no drop-position
 * render state; `@portabletext/plugin-dnd` tracks positions from the public
 * `drag.*` events in its own store. This pins that dragover stays out of
 * the render path entirely.
 */
describe('drop position re-renders', () => {
  test('a dragover re-renders no block', async () => {
    const renders: Array<string> = []

    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children, node}) => {
        renders.push(node._key)
        return <div {...attributes}>{children}</div>
      },
    })

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        block('b0', 'first'),
        block('b1', 'second'),
        block('b2', 'third'),
        block('b3', 'fourth'),
      ],
      children: <NodePlugin nodes={[textBlock]} />,
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

    // A negative has no signal to await, so a real edit bounds the window:
    // `b3`'s render flushes in the same React commit or later than any
    // damage the dragover could have caused.
    editor.send({
      type: 'select',
      at: {
        anchor: {path: spanPath('b3'), offset: 6},
        focus: {path: spanPath('b3'), offset: 6},
      },
    })
    editor.send({type: 'insert.text', text: '!'})

    await vi.waitFor(() => {
      if (!renders.includes('b3')) {
        throw new Error('edit not rendered yet')
      }
    })

    expect([...new Set(renders)]).toEqual(['b3'])
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

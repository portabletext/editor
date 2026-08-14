import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {defineTextBlock, type EditorSelection, type Path} from '../src'
import {useElementDropPosition} from '../src/editor/drop-position-state-context'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({})

/**
 * A `dragover` tick sets the editor-wide drop position. It must not re-render
 * the block tree: only the block gaining or losing the indicator re-renders,
 * and no block's content render runs. Pins that the drop position is
 * delivered per block (via the drop-position store), not as a
 * `renderElement` dependency that hands the engine a new render function
 * every tick and re-renders everything.
 */
describe('drop position re-renders', () => {
  test('a dragover tracks the drop position without re-rendering any block', async () => {
    const renders: Array<string> = []

    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children, node}) => {
        renders.push(node._key)
        return (
          <div {...attributes}>
            {children}
            <DropPositionProbe
              blockKey={node._key}
              path={[{_key: node._key}]}
            />
          </div>
        )
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

    // The drag is tracked and delivered to the hovered block's slice of
    // the drop-position store.
    await vi.waitFor(() => {
      const probe = document.querySelector(
        '[data-testid="drop-position"][data-block-key="b2"]',
      )
      if (probe?.getAttribute('data-position') !== 'end') {
        throw new Error('drop position not tracked yet')
      }
    })

    // No block's content re-rendered to get there. Before the per-block
    // delivery, every block re-rendered on the tick: `renders` would hold
    // every key.
    expect(renders).toEqual([])
  })

  test('a dragover paints the indicator on the default, unregistered render path', async () => {
    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition,
      initialValue: [
        block('b0', 'first'),
        block('b1', 'second'),
        block('b2', 'third'),
        block('b3', 'fourth'),
      ],
    })

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )

    await vi.waitFor(() => {
      if (document.querySelectorAll('.pt-drop-indicator').length !== 1) {
        throw new Error('drop indicator not shown yet')
      }
    })
  })
})

/**
 * Reads the drop-position store directly (the store the drop indicator
 * consumes) to confirm the tick reached block `path` without depending on
 * a block-level default renderer wrapping the indicator.
 */
function DropPositionProbe(props: {blockKey: string; path: Path}) {
  const position = useElementDropPosition(props.path)
  return (
    <div
      contentEditable={false}
      data-testid="drop-position"
      data-block-key={props.blockKey}
      data-position={position ?? ''}
    />
  )
}

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

import type {EditorSelection, Path} from '@portabletext/editor'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {DndProvider, useDropPosition} from './plugin.dnd'

const schemaDefinition = defineSchema({})

describe('DndProvider', () => {
  test('Scenario: Dragging an entire block over another block shows the drop position', async () => {
    const {editor, renders} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'end'})
    expect(renders.filter((blockKey) => blockKey === 'b2')).toHaveLength(1)
    expect(renders).not.toContain('b0')
    expect(renders).not.toContain('b1')
  })

  test('Scenario: Dragging over the dragged block itself shows nothing', async () => {
    const {editor} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b0'),
        block: 'start',
      }),
    )

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
  })

  test('Scenario: Dragging a text selection shows nothing', async () => {
    const {editor} = await renderEditorWithProbes()

    editor.send(
      dragover({
        // Only part of `b0`'s text, so this is a text drag, not a block drag
        dragOrigin: {
          anchor: {path: spanPath('b0'), offset: 0},
          focus: {path: spanPath('b0'), offset: 2},
        },
        over: caretIn('b2'),
        block: 'end',
      }),
    )

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
  })

  test('Scenario: Moving the drag notifies only the blocks losing and gaining the indicator', async () => {
    const {editor, renders} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b1'),
        block: 'start',
      }),
    )
    await expectDropPositions({b1: 'start', b2: 'none'})
    renders.length = 0

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'start',
      }),
    )
    await expectDropPositions({b1: 'none', b2: 'start'})

    expect(renders.filter((blockKey) => blockKey === 'b1')).toHaveLength(1)
    expect(renders.filter((blockKey) => blockKey === 'b2')).toHaveLength(1)
    expect(renders).not.toContain('b0')
  })

  test('Scenario: Ending the drag clears the drop position', async () => {
    const {editor} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )
    await expectDropPositions({b2: 'end'})

    editor.send({
      type: 'drag.dragend',
      originEvent: {dataTransfer: new DataTransfer()},
    })

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
  })
})

function DropPositionProbe(props: {
  blockKey: string
  onRender: (blockKey: string) => void
}) {
  const path: Path = [{_key: props.blockKey}]
  const dropPosition = useDropPosition(path)
  props.onRender(props.blockKey)
  return (
    <div data-testid={`probe-${props.blockKey}`}>{dropPosition ?? 'none'}</div>
  )
}

async function renderEditorWithProbes() {
  const renders: Array<string> = []

  const {editor} = await createTestEditor({
    schemaDefinition,
    initialValue: [
      block('b0', 'first'),
      block('b1', 'second'),
      block('b2', 'third'),
    ],
    children: (
      <DndProvider>
        {['b0', 'b1', 'b2'].map((blockKey) => (
          <DropPositionProbe
            key={blockKey}
            blockKey={blockKey}
            onRender={(renderedKey) => renders.push(renderedKey)}
          />
        ))}
      </DndProvider>
    ),
  })

  // Settle the initial probe renders before tests start counting
  await vi.waitFor(() => {
    expect(page.getByTestId('probe-b2').element().textContent).toBe('none')
  })
  renders.length = 0

  return {editor, renders}
}

async function expectDropPositions(
  expected: Record<string, string>,
): Promise<void> {
  await vi.waitFor(() => {
    for (const [blockKey, dropPosition] of Object.entries(expected)) {
      expect(
        page.getByTestId(`probe-${blockKey}`).element().textContent,
        `drop position of ${blockKey}`,
      ).toBe(dropPosition)
    }
  })
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
  const textLength = blockKey === 'b0' ? 5 : blockKey === 'b1' ? 6 : 5

  return {
    anchor: {path: spanPath(blockKey), offset: 0},
    focus: {path: spanPath(blockKey), offset: textLength},
  }
}

function caretIn(blockKey: string): NonNullable<EditorSelection> {
  return {
    anchor: {path: spanPath(blockKey), offset: 0},
    focus: {path: spanPath(blockKey), offset: 0},
  }
}

import {
  defineContainer,
  type Editor,
  type EditorSelection,
  type Path,
} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {DndProvider, useDropPosition} from './plugin.dnd'

const schemaDefinition = defineSchema({})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
})

const containerSchemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'callout',
      fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
    },
  ],
})

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

  test('Scenario: Dragging over the middle of a non-empty text block hides the indicator', async () => {
    const {editor} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretMidText('b2'),
        block: 'end',
      }),
    )

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
  })

  test('Scenario: Dragging over the edge of a non-empty text block still shows the indicator', async () => {
    const {editor} = await renderEditorWithProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'start',
      }),
    )

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'start'})
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

  test('Scenario: An edge drop indicator hides the native drop caret', async () => {
    const {editor} = await renderEditorWithProbes()
    const editorElement = getEditorElement(editor)

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )

    await expectDropPositions({b2: 'end'})
    expect(editorElement.style.caretColor).toBe('transparent')
  })

  test('Scenario: Moving from an edge to a mid-block position restores the native drop caret', async () => {
    const {editor} = await renderEditorWithProbes()
    const editorElement = getEditorElement(editor)

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )
    await expectDropPositions({b2: 'end'})
    expect(editorElement.style.caretColor).toBe('transparent')

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretMidText('b2'),
        block: 'end',
      }),
    )
    await expectDropPositions({b2: 'none'})
    expect(editorElement.style.caretColor).toBe('')
  })

  test('Scenario: Ending the drag restores the native drop caret', async () => {
    const {editor} = await renderEditorWithProbes()
    const editorElement = getEditorElement(editor)

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )
    await expectDropPositions({b2: 'end'})
    expect(editorElement.style.caretColor).toBe('transparent')

    editor.send({
      type: 'drag.dragend',
      originEvent: {dataTransfer: new DataTransfer()},
    })

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
    expect(editorElement.style.caretColor).toBe('')
  })

  test('Scenario: A prior inline caret-color survives being hidden and restored', async () => {
    const {editor} = await renderEditorWithProbes()
    const editorElement = getEditorElement(editor)
    editorElement.style.caretColor = 'red'

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: caretIn('b2'),
        block: 'end',
      }),
    )
    await expectDropPositions({b2: 'end'})
    expect(editorElement.style.caretColor).toBe('transparent')

    editor.send({
      type: 'drag.dragend',
      originEvent: {dataTransfer: new DataTransfer()},
    })

    await expectDropPositions({b0: 'none', b1: 'none', b2: 'none'})
    expect(editorElement.style.caretColor).toBe('red')
  })
})

describe('DndProvider with a nested container', () => {
  test('Scenario: Dragging a root block over a nested block shows the drop position on the nested block, not the container', async () => {
    const {editor} = await renderEditorWithContainerProbes()

    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: nestedCaretIn(),
        block: 'end',
      }),
    )

    await expectNestedDropPositions({container: 'none', nested: 'end'})
  })

  test('Scenario: Dragging a nested block over itself shows nothing', async () => {
    const {editor} = await renderEditorWithContainerProbes()

    // Seeds a real, non-'none' position at the nested block first: a
    // suppressed dragover is a no-op, so starting from 'none' can't tell a
    // genuine suppression from a guard that never ran and left 'none' alone.
    editor.send(
      dragover({
        dragOrigin: blockSelection('b0'),
        over: nestedCaretIn(),
        block: 'start',
      }),
    )
    await expectNestedDropPositions({nested: 'start'})

    editor.send(
      dragover({
        dragOrigin: nestedBlockSelection(),
        over: nestedCaretIn(),
        block: 'end',
      }),
    )

    // A suppressed dragover is a no-op: nothing re-renders to confirm it
    // ran, so there's no observable condition for `vi.waitFor` to poll on.
    // Wait a tick for any (incorrect) update to land before reading.
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(page.getByTestId('probe-nested').element().textContent).toBe('start')
  })
})

function getEditorElement(editor: Editor): HTMLElement {
  const element = editor.dom.getEditorElement()

  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected the editor element to be an HTMLElement')
  }

  return element
}

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

const containerKey = 'callout0'
const nestedKey = 'n0'
const nestedSpanKey = 'n0-span'
const containerPath: Path = [{_key: containerKey}]
const nestedPath: Path = [{_key: containerKey}, 'content', {_key: nestedKey}]

function PathDropPositionProbe(props: {label: string; path: Path}) {
  const dropPosition = useDropPosition(props.path)
  return (
    <div data-testid={`probe-${props.label}`}>{dropPosition ?? 'none'}</div>
  )
}

async function renderEditorWithContainerProbes() {
  const {editor} = await createTestEditor({
    schemaDefinition: containerSchemaDefinition,
    initialValue: [
      block('b0', 'first'),
      {
        _type: 'callout',
        _key: containerKey,
        content: [
          {
            _type: 'block',
            _key: nestedKey,
            children: [
              {_type: 'span', _key: nestedSpanKey, text: 'nested', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      } as unknown as PortableTextBlock,
    ],
    children: (
      <>
        <NodePlugin nodes={[calloutContainer]} />
        <DndProvider>
          <PathDropPositionProbe label="container" path={containerPath} />
          <PathDropPositionProbe label="nested" path={nestedPath} />
        </DndProvider>
      </>
    ),
  })

  await vi.waitFor(() => {
    expect(page.getByTestId('probe-nested').element().textContent).toBe('none')
  })

  return {editor}
}

async function expectNestedDropPositions(
  expected: Record<string, string>,
): Promise<void> {
  await vi.waitFor(() => {
    for (const [label, dropPosition] of Object.entries(expected)) {
      expect(
        page.getByTestId(`probe-${label}`).element().textContent,
        `drop position of ${label}`,
      ).toBe(dropPosition)
    }
  })
}

function nestedCaretIn(): NonNullable<EditorSelection> {
  const path = [...nestedPath, 'children', {_key: nestedSpanKey}]
  return {
    anchor: {path, offset: 0},
    focus: {path, offset: 0},
  }
}

function nestedBlockSelection(): NonNullable<EditorSelection> {
  const path = [...nestedPath, 'children', {_key: nestedSpanKey}]
  return {
    anchor: {path, offset: 0},
    focus: {path, offset: 'nested'.length},
  }
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

function caretMidText(blockKey: string): NonNullable<EditorSelection> {
  return {
    anchor: {path: spanPath(blockKey), offset: 2},
    focus: {path: spanPath(blockKey), offset: 2},
  }
}

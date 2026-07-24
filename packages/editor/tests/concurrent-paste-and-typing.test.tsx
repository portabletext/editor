import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator, getTersePt} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page, userEvent} from 'vitest/browser'
import type {Editor} from '../src/editor'
import {PortableTextEditable} from '../src/editor/Editable'
import {EditorProvider} from '../src/editor/editor-provider'
import {EventListenerPlugin} from '../src/plugins'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {getSelectionAfterText} from '../test-utils/text-selection'

async function createPatchOnlyTestEditors(options: {
  initialValue: Array<PortableTextBlock>
}) {
  const editorRef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()

  const keyGenerator = createTestKeyGenerator('ea-')
  const keyGeneratorB = createTestKeyGenerator('eb-')
  const mutationsFromA: Array<Array<Patch>> = []
  const mutationsFromB: Array<Array<Patch>> = []

  render(
    <>
      <EditorProvider
        initialConfig={{
          keyGenerator,
          schemaDefinition: defineSchema({}),
          initialValue: options.initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable data-testid="editor-a" />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutationsFromA.push(event.patches)
            }
          }}
        />
      </EditorProvider>
      <EditorProvider
        initialConfig={{
          keyGenerator: keyGeneratorB,
          schemaDefinition: defineSchema({}),
          initialValue: options.initialValue,
        }}
      >
        <EditorRefPlugin ref={editorBRef} />
        <PortableTextEditable data-testid="editor-b" />
        <EventListenerPlugin
          on={(event) => {
            if (event.type === 'mutation') {
              mutationsFromB.push(event.patches)
            }
          }}
        />
      </EditorProvider>
    </>,
  )

  const locator = page.getByTestId('editor-a')
  const locatorB = page.getByTestId('editor-b')

  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  await vi.waitFor(() => expect.element(locatorB).toBeInTheDocument())

  return {
    editor: editorRef.current!,
    locator,
    editorB: editorBRef.current!,
    locatorB,
    mutationsFromA,
    mutationsFromB,
  }
}

const pastedText =
  'ALPHA The newsroom shipped its quarterly report before dawn.'
const typedText = 'asdasds'
const linePrefix = 'A: '

function buildInitialValue(): Array<PortableTextBlock> {
  return [
    {
      _type: 'block',
      _key: 'b0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 's0', text: linePrefix, marks: []}],
    },
  ]
}

type SnapshotMode = 'optimistic' | 'undefined'

async function typeAndWaitForMutation(
  locator: Parameters<typeof userEvent.type>[0],
  character: string,
  mutations: Array<Array<Patch>>,
): Promise<void> {
  const mutationCount = mutations.length
  await userEvent.type(locator, character)
  await vi.waitFor(() => {
    expect(mutations.length).toBeGreaterThan(mutationCount)
  })
}

function deliverMutations(
  mutations: Array<Array<Patch>>,
  target: Editor,
  snapshotMode: SnapshotMode,
): void {
  for (const patches of mutations.splice(0)) {
    const remotePatches = patches.map(
      (patch): Patch => ({...patch, origin: 'remote'}),
    )
    const snapshot =
      snapshotMode === 'optimistic'
        ? applyAll(target.getSnapshot().context.value, remotePatches)
        : undefined

    target.send({type: 'patches', patches: remotePatches, snapshot})
  }
}

const expectedResult = linePrefix + pastedText + typedText

describe('Concurrent paste and typing race', () => {
  test.each([
    {snapshotMode: 'optimistic' as const},
    {snapshotMode: 'undefined' as const},
  ])(
    'rebases mixed-base patches with $snapshotMode snapshots',
    async ({snapshotMode}) => {
      const {
        editor,
        locator,
        editorB,
        locatorB,
        mutationsFromA,
        mutationsFromB,
      } = await createPatchOnlyTestEditors({initialValue: buildInitialValue()})

      await userEvent.click(locator)
      const selectionA = getSelectionAfterText(
        editor.getSnapshot().context,
        linePrefix,
      )
      editor.send({type: 'select', at: selectionA})
      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.selection).toEqual(selectionA)
      })

      await userEvent.click(locatorB)
      const selectionB = getSelectionAfterText(
        editorB.getSnapshot().context,
        linePrefix,
      )
      editorB.send({type: 'select', at: selectionB})
      await vi.waitFor(() => {
        expect(editorB.getSnapshot().context.selection).toEqual(selectionB)
      })

      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', pastedText)

      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {selection: editor.getSnapshot().context.selection!},
      })

      await vi.waitFor(() => {
        expect(mutationsFromA.length).toBeGreaterThan(0)
      })

      for (const character of typedText.slice(0, 3)) {
        await typeAndWaitForMutation(locatorB, character, mutationsFromB)
      }

      deliverMutations(mutationsFromA, editorB, snapshotMode)
      deliverMutations(mutationsFromB, editor, snapshotMode)

      for (const character of typedText.slice(3)) {
        await typeAndWaitForMutation(locatorB, character, mutationsFromB)
        deliverMutations(mutationsFromB, editor, snapshotMode)
      }

      await vi.waitFor(() => {
        expect(getTersePt(editor.getSnapshot().context)[0]).toBe(expectedResult)
        expect(getTersePt(editorB.getSnapshot().context)[0]).toBe(
          expectedResult,
        )
      })
    },
  )
})

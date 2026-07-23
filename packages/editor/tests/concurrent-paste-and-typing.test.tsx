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

/**
 * Sets up two editors sharing one document, relaying `patches` between them
 * the way Studio's real-time collaboration delivers remote edits: through
 * the patch stream produced by each editor's own mutations.
 *
 * Studio also pushes a wholesale `update value` alongside the patch stream,
 * sourced from the document store's own snapshot. That channel introduces a
 * second, distinct failure mode (a client's pending local edit can be
 * clobbered outright if a value update arrives before the store has
 * incorporated that edit) which isn't modeled here. This test isolates the
 * patch-merging bug in the core editor.
 */
async function createPatchOnlyTestEditors(options: {
  initialValue: Array<PortableTextBlock>
}) {
  const editorRef = React.createRef<Editor>()
  const editorBRef = React.createRef<Editor>()

  const keyGenerator = createTestKeyGenerator('ea-')
  const keyGeneratorB = createTestKeyGenerator('eb-')

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
              editorBRef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: event.value,
              })
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
              editorRef.current?.send({
                type: 'patches',
                patches: event.patches.map((patch) => ({
                  ...patch,
                  origin: 'remote',
                })),
                snapshot: event.value,
              })
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

/**
 * Types `text` one character at a time with a pause between keystrokes,
 * standing in for a real person typing rather than a test hand-syncing
 * itself to the exact moment a remote edit arrives. Nothing here reads the
 * editors' state; the timing is fixed up front, same as a person's typing
 * cadence doesn't adapt to network latency they can't see.
 */
async function typeCharacterByCharacter(
  locator: Parameters<typeof userEvent.type>[0],
  text: string,
  pauseMs: number,
) {
  for (const character of text) {
    await userEvent.type(locator, character)
    await new Promise((resolve) => setTimeout(resolve, pauseMs))
  }
}

/**
 * The correct outcome: Editor A's paste happened first, so it should end up
 * ahead of Editor B's typed text, with nothing lost or duplicated on either
 * side.
 */
const expectedResult = linePrefix + pastedText + typedText

/**
 * Reproduces a reported bug: two editors on the same field, with carets on
 * the same line. Editor A pastes text right after "A: ". A couple hundred
 * milliseconds later, before Editor B has received Editor A's edit, Editor
 * B starts typing at the same spot.
 *
 * Each editor learns about the other's edit through a `diffMatchPatch`
 * patch computed against the shared base text "A: ". Applying that patch
 * means fuzzy-matching the "A: " context in the editor's *current* (already
 * locally-edited) text and inserting right after it, regardless of what
 * that editor has already placed there. Neither side's local edit is
 * treated as coming "before" or "after" the other's; there's no tie-break
 * for concurrent inserts at the same anchor point. When the remote patch
 * lands mid-keystroke, the local typing burst itself ends up split around
 * it: both editors converge on the same document, but it's the wrong one,
 * with the pasted sentence nested inside the typed text.
 */
describe('Concurrent paste and typing race', () => {
  test.each([
    {startDelayMs: 200, pauseMs: 120},
    {startDelayMs: 250, pauseMs: 150},
  ])(
    "Editor B types over Editor A's paste (startDelay: $startDelayMs ms, keystroke pause: $pauseMs ms)",
    async ({startDelayMs, pauseMs}) => {
      const {editor, locator, editorB, locatorB} =
        await createPatchOnlyTestEditors({initialValue: buildInitialValue()})

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

      // Editor A pastes right after "A: ".
      editor.send({
        type: 'clipboard.paste',
        originEvent: {dataTransfer},
        position: {selection: editor.getSnapshot().context.selection!},
      })

      // A couple hundred milliseconds later, Editor B starts typing at a
      // natural, unhurried pace, unaware that Editor A just pasted there too.
      await new Promise((resolve) => setTimeout(resolve, startDelayMs))
      await typeCharacterByCharacter(locatorB, typedText, pauseMs)

      // Give both editors time to exchange and settle their patches.
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Both editors should converge on "A: {pasted text}{typed text}":
      // Editor A's paste, which happened first, followed by Editor B's typed
      // text as one unbroken run.
      //
      // In practice they converge on the same document, but it's the wrong
      // one: the pasted text ends up nested inside the typed text instead
      // (e.g. "A: asdALPHA The newsroom shipped its quarterly report before
      // dawn.asds"). The exact split point is timing-dependent, so rather
      // than assert on that garbled shape, these assertions are written
      // against the correct outcome and are expected to fail, with
      // Vitest's diff showing the actual, garbled text.
      const finalTextA = getTersePt(editor.getSnapshot().context)[0]
      const finalTextB = getTersePt(editorB.getSnapshot().context)[0]

      expect(finalTextA).toBe(expectedResult)
      expect(finalTextB).toBe(expectedResult)
    },
  )
})

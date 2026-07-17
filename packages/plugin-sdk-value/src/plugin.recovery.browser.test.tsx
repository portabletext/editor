import type {Editor} from '@portabletext/editor'
import {EditorProvider, PortableTextEditable} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {createRef} from 'react'
import {afterEach, describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {page} from 'vitest/browser'
import {ValueSyncPlugin} from './plugin.sdk-value'

function createMockValueStore(initialValue: PortableTextBlock[] = []) {
  let value = initialValue
  let subscriber: (() => void) | null = null

  const pushValue = vi.fn((newValue: PortableTextBlock[]) => {
    value = newValue
    subscriber?.()
  })

  return {
    getRemoteValue: () => value,
    pushValue,
    onRemoteValueChange: (callback: () => void) => {
      subscriber = callback
      return () => {
        subscriber = null
      }
    },
    // Simulate a remote change (updates value and notifies subscriber)
    setRemoteValue: (newValue: PortableTextBlock[]) => {
      value = newValue
      subscriber?.()
    },
  }
}

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}, {name: 'underline'}],
})

function makeSpanBlock(marks: Array<string>): PortableTextBlock {
  return {
    _type: 'block',
    _key: 'b1',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 's1', text: 'hello', marks}],
  }
}

function getSpanMarks(editor: Editor): Array<string> | undefined {
  const [block] = editor.getSnapshot().context.value ?? []
  if (!block || !('children' in block)) {
    return undefined
  }
  const [child] = block.children as Array<{marks?: Array<string>}>
  return child?.marks
}

describe('ValueSyncPlugin diff recovery', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  test('recovers with a full value update when a diff patch is unconvertible', async () => {
    // A span carrying several decorator marks. Clearing more than one of them
    // at once makes `diffValue` emit an array slice (`...marks[1:]`) which
    // `arrayifyPath` can't convert — the exact case that used to throw inside
    // the synchronous `applySync` and break syncing.
    const initialValue = [makeSpanBlock(['strong', 'em', 'underline'])]
    const store = createMockValueStore(initialValue)

    const editorRef = createRef<Editor>()
    const result = await render(
      <EditorProvider
        initialConfig={{
          keyGenerator: createTestKeyGenerator(),
          schemaDefinition,
          initialValue,
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable />
        <ValueSyncPlugin
          getRemoteValue={store.getRemoteValue}
          pushValue={store.pushValue}
          onRemoteValueChange={store.onRemoteValueChange}
        />
      </EditorProvider>,
    )
    cleanup = result.unmount

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
    const editor = editorRef.current!

    await vi.waitFor(() => {
      expect([...(getSpanMarks(editor) ?? [])].sort()).toEqual([
        'em',
        'strong',
        'underline',
      ])
    })

    // The remote clears all but the first mark. The diff contains an
    // unconvertible slice unset, so instead of throwing the plugin must fall
    // back to a full `update value` and converge on the remote value.
    const remoteValue = [makeSpanBlock(['strong'])]
    expect(() => store.setRemoteValue(remoteValue)).not.toThrow()

    await vi.waitFor(() => {
      expect(getSpanMarks(editor)).toEqual(['strong'])
    })
  })
})

import {
  EditorProvider,
  type Editor,
  type PortableTextBlock,
} from '@portabletext/editor'
import {EditorRefPlugin} from '@portabletext/editor/plugins'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {PilcrowEditor} from '../src/editor'
import {schemaDefinition} from '../src/schema'

/**
 * Callouts let users change the tone (note / tip / warning / caution)
 * inline without dropping into the JSON inspector. The header label
 * becomes a `<select>`; changing it emits a `set` on the tone field.
 */

async function mount(initialValue: Array<PortableTextBlock>) {
  const editorRef = React.createRef<Editor>()
  const keyGenerator = createTestKeyGenerator()
  const result = await render(
    <EditorProvider
      initialConfig={{
        keyGenerator,
        schemaDefinition,
        initialValue,
      }}
    >
      <EditorRefPlugin ref={editorRef} />
      <PilcrowEditor />
    </EditorProvider>,
  )
  const locator = result.locator.getByRole('textbox')
  await vi.waitFor(() => expect.element(locator).toBeInTheDocument())
  if (!editorRef.current) {
    throw new Error('editor ref not set')
  }
  return {editor: editorRef.current, container: result.container}
}

describe('callout tone switcher', () => {
  test('renders the current tone as a select element', async () => {
    const initial = [
      {
        _type: 'callout',
        _key: 'C1',
        tone: 'tip',
        content: [
          {
            _type: 'block',
            _key: 'B1',
            style: 'normal',
            children: [
              {_type: 'span', _key: 'S1', text: 'Try this', marks: []},
            ],
            markDefs: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {container} = await mount(initial)
    const select = container.querySelector<HTMLSelectElement>(
      'select.pc-callout-tone-select',
    )
    expect(select).toBeTruthy()
    expect(select?.value).toBe('tip')
  })

  test('changing the select value updates the callout tone field', async () => {
    const initial = [
      {
        _type: 'callout',
        _key: 'C1',
        tone: 'note',
        content: [
          {
            _type: 'block',
            _key: 'B1',
            style: 'normal',
            children: [{_type: 'span', _key: 'S1', text: 'x', marks: []}],
            markDefs: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {editor, container} = await mount(initial)
    const select = container.querySelector<HTMLSelectElement>(
      'select.pc-callout-tone-select',
    )
    expect(select).toBeTruthy()
    if (!select) {
      throw new Error('select missing')
    }
    select.value = 'warning'
    select.dispatchEvent(new Event('change', {bubbles: true}))
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect((value[0] as unknown as {tone: string}).tone).toBe('warning')
    })
  })
})

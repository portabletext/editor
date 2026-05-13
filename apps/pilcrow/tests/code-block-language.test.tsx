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
 * The code-block header should let users change the language without
 * dropping into the JSON inspector. Renders as a \`<select>\` whose
 * change handler emits a \`set\` on the language field.
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

describe('code-block language switcher', () => {
  test('renders the current language as a select element', async () => {
    const initial = [
      {
        _type: 'code-block',
        _key: 'C1',
        language: 'ts',
        lines: [
          {
            _type: 'block',
            _key: 'B1',
            style: 'normal',
            children: [
              {_type: 'span', _key: 'S1', text: 'console.log()', marks: []},
            ],
            markDefs: [],
          },
        ],
      },
    ] as Array<PortableTextBlock>
    const {container} = await mount(initial)
    const select = container.querySelector<HTMLSelectElement>(
      'select.pc-code-block-language-select',
    )
    expect(select).toBeTruthy()
    expect(select!.value).toBe('ts')
  })

  test('changing the select value updates the code-block language field', async () => {
    const initial = [
      {
        _type: 'code-block',
        _key: 'C1',
        language: 'ts',
        lines: [
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
      'select.pc-code-block-language-select',
    )!
    select.value = 'js'
    select.dispatchEvent(new Event('change', {bubbles: true}))
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect((value[0] as unknown as {language: string}).language).toBe('js')
    })
  })
})

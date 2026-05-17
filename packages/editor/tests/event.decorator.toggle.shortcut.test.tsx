import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineContainer, defineSchema} from '../src'
import {IS_MAC} from '../src/internal-utils/is-hotkey'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

describe('decorator shortcut guard', () => {
  test('Scenario: Cmd+B intercepts when selection focus is in a container whose sub-schema does not declare strong, but the root does', async () => {
    const keyGenerator = createTestKeyGenerator()
    const paragraphSpan = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'paragraph',
      marks: [],
    }
    const paragraph = {
      _key: keyGenerator(),
      _type: 'block',
      children: [paragraphSpan],
      markDefs: [],
      style: 'normal',
    }
    const codeBlockLineSpan = {
      _key: keyGenerator(),
      _type: 'span',
      text: 'code',
      marks: [],
    }
    const codeBlockLine = {
      _key: keyGenerator(),
      _type: 'block',
      children: [codeBlockLineSpan],
      markDefs: [],
      style: 'normal',
    }
    const codeBlock = {
      _key: keyGenerator(),
      _type: 'code-block',
      lines: [codeBlockLine],
    }

    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [{type: 'block', styles: [{name: 'normal'}], decorators: []}],
            },
          ],
        },
      ],
    })

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [paragraph, codeBlock],
      children: (
        <NodePlugin
          nodes={[
            defineContainer({
              type: 'code-block',
              arrayField: 'lines',
            }),
          ]}
        />
      ),
    })

    await userEvent.click(locator)

    // Selection: anchor in paragraph, focus in code-block-line.
    // The focus block (code-block-line) is in a container whose sub-schema
    // does NOT declare `strong` (the inline `{type: 'block', styles: [...], decorators: []}`
    // declaration explicitly empties decorators, overriding root inheritance).
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: paragraph._key},
            'children',
            {_key: paragraphSpan._key},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: codeBlock._key},
            'lines',
            {_key: codeBlockLine._key},
            'children',
            {_key: codeBlockLineSpan._key},
          ],
          offset: 4,
        },
      },
    })

    await userEvent.keyboard(
      IS_MAC ? '{Meta>}b{/Meta}' : '{Control>}b{/Control}',
    )

    // Paragraph span should be marked strong; code-block-line span should not
    // (the operation per-block-filters spans against their sub-schema).
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toEqual([
        {
          ...paragraph,
          children: [{...paragraph.children[0], marks: ['strong']}],
        },
        codeBlock,
      ])
    })
  })
})

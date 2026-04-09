import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {RendererPlugin} from '../src/plugins/plugin.renderer'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      ],
    },
  ],
})

function CodeBlockRenderer({
  attributes,
  children,
}: {
  attributes: Record<string, unknown>
  children: React.ReactNode
}) {
  return (
    <pre {...attributes} data-testid="code-block">
      <code>{children}</code>
    </pre>
  )
}

describe('container split and merge', () => {
  test('pressing Enter splits a text block inside a code block', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator() // k0
    const blockKey = keyGenerator() // k1
    const spanKey = keyGenerator() // k2

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'hello world',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            {renderer: {type: 'code-block', render: CodeBlockRenderer}},
          ]}
        />
      ),
    })

    // Wait for the code block to render
    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-testid="code-block"]'),
      ).not.toBeNull()
    })

    // Click on the text to place cursor
    const textSpan = locator
      .element()
      .querySelector(
        `[data-pt-path='[_key=="${codeBlockKey}"].content[_key=="${blockKey}"].children[_key=="${spanKey}"]']`,
      )
    expect(textSpan).not.toBeNull()
    await userEvent.click(textSpan!)

    // Wait for selection
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Type to position cursor at "hello| world" (offset 5)
    // Click places cursor at offset 0, so type 5 chars then select
    // Actually, let's use a simpler approach: type at offset 0, then Enter
    await userEvent.keyboard('{Enter}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value

      // The code block should now have two text blocks inside content.
      // Click places cursor at end of text, so the first block keeps
      // the text and the second block is empty.
      expect(value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'hello world',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: expect.any(String),
              children: [
                {
                  _type: 'span',
                  _key: expect.any(String),
                  text: '',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })

  test('pressing Backspace at start of second block merges with first', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator() // k0
    const block1Key = keyGenerator() // k1
    const span1Key = keyGenerator() // k2
    const block2Key = keyGenerator() // k3
    const span2Key = keyGenerator() // k4

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {
                  _type: 'span',
                  _key: span1Key,
                  text: 'first',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
            {
              _type: 'block',
              _key: block2Key,
              children: [
                {
                  _type: 'span',
                  _key: span2Key,
                  text: 'second',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: (
        <RendererPlugin
          renderers={[
            {renderer: {type: 'code-block', render: CodeBlockRenderer}},
          ]}
        />
      ),
    })

    // Wait for the code block to render
    await vi.waitFor(() => {
      expect(
        locator.element().querySelector('[data-testid="code-block"]'),
      ).not.toBeNull()
    })

    // Click on the second block's text to place cursor at start
    const textSpan2 = locator
      .element()
      .querySelector(
        `[data-pt-path='[_key=="${codeBlockKey}"].content[_key=="${block2Key}"].children[_key=="${span2Key}"]']`,
      )
    expect(textSpan2).not.toBeNull()
    await userEvent.click(textSpan2!)

    // Wait for selection
    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).not.toBeNull()
    })

    // Backspace at start of second block should merge with first
    await userEvent.keyboard('{Backspace}')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value

      // Should merge into a single text block
      expect(value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          content: [
            {
              _type: 'block',
              _key: block1Key,
              children: [
                {
                  _type: 'span',
                  _key: span1Key,
                  text: 'firstsecond',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])
    })
  })
})

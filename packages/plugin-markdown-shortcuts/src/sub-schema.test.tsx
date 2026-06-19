import {defineContainer, defineSchema} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {MarkdownShortcutsPlugin} from './plugin.markdown-shortcuts'

describe('Markdown shortcuts respect the sub-schema at the focus', () => {
  test('typing `# ` inside a code-block-line does not consume the keystroke', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}, {name: 'em'}],
      styles: [{name: 'normal'}, {name: 'h1'}, {name: 'h2'}, {name: 'h3'}],
      lists: [{name: 'bullet'}, {name: 'number'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [{name: 'code'}],
                  styles: [{name: 'code'}],
                  lists: [],
                  annotations: [],
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({attributes, childrenAttributes, children}) => (
        <pre data-testid="code-block" {...attributes} {...childrenAttributes}>
          {children}
        </pre>
      ),
    })

    const initialValue = [
      {
        _type: 'code-block',
        _key: 'cb1',
        lines: [
          {
            _type: 'block',
            _key: 'l1',
            children: [{_type: 'span', _key: 's1', text: '', marks: []}],
            markDefs: [],
            style: 'code',
          },
        ],
      },
    ]

    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue,
      children: (
        <>
          <NodePlugin nodes={[codeBlockContainer]} />
          <MarkdownShortcutsPlugin
            defaultStyle={({context}) => context.schema.styles[0]?.name}
            headingStyle={({context, props}) =>
              context.schema.styles.find(
                (style) => style.name === `h${props.level}`,
              )?.name
            }
            blockquoteStyle={({context}) =>
              context.schema.styles.find((style) => style.name === 'blockquote')
                ?.name
            }
            unorderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'bullet')?.name
            }
            orderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'number')?.name
            }
          />
        </>
      ),
    })

    const codeBlockElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="code-block"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(codeBlockElement)
    await userEvent.keyboard('# ')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [
            {
              _type: 'block',
              _key: 'l1',
              children: [{_type: 'span', _key: 's1', text: '# ', marks: []}],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('typing `- ` inside a code-block-line does not consume the keystroke', async () => {
    const schemaDefinition = defineSchema({
      styles: [{name: 'normal'}],
      lists: [{name: 'bullet'}, {name: 'number'}],
      blockObjects: [
        {
          name: 'code-block',
          fields: [
            {
              name: 'lines',
              type: 'array',
              of: [
                {
                  type: 'block',
                  decorators: [{name: 'code'}],
                  styles: [{name: 'code'}],
                  lists: [],
                  annotations: [],
                  inlineObjects: [],
                },
              ],
            },
          ],
        },
      ],
    })

    const codeBlockContainer = defineContainer({
      type: 'code-block',
      arrayField: 'lines',
      render: ({attributes, childrenAttributes, children}) => (
        <pre data-testid="code-block" {...attributes} {...childrenAttributes}>
          {children}
        </pre>
      ),
    })

    const {editor} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [
            {
              _type: 'block',
              _key: 'l1',
              children: [{_type: 'span', _key: 's1', text: '', marks: []}],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ],
      children: (
        <>
          <NodePlugin nodes={[codeBlockContainer]} />
          <MarkdownShortcutsPlugin
            defaultStyle={({context}) => context.schema.styles[0]?.name}
            unorderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'bullet')?.name
            }
            orderedList={({context}) =>
              context.schema.lists.find((list) => list.name === 'number')?.name
            }
          />
        </>
      ),
    })

    const codeBlockElement = await vi.waitFor(() => {
      const element = document.querySelector('[data-testid="code-block"]')
      expect(element).not.toEqual(null)
      return element!
    })

    await userEvent.click(codeBlockElement)
    await userEvent.keyboard('- ')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [
            {
              _type: 'block',
              _key: 'l1',
              children: [{_type: 'span', _key: 's1', text: '- ', marks: []}],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })

  test('typing a markdown link when no link annotation is declared does not consume the keystroke or move the caret', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'strong'}],
      styles: [{name: 'normal'}],
      // No link annotation declared.
      annotations: [],
    })

    const {editor, locator} = await createTestEditor({
      schemaDefinition,
      children: (
        <MarkdownShortcutsPlugin
          defaultStyle={({context}) => context.schema.styles[0]?.name}
          linkObject={({context, props}) => {
            const link = context.schema.annotations.find(
              (annotation) => annotation.name === 'link',
            )
            if (!link) {
              return undefined
            }
            return {_type: link.name, href: props.href}
          }}
        />
      ),
    })

    await userEvent.click(locator)
    await userEvent.keyboard('[[foo](bar)')

    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(1)
      const block = value[0] as {
        children: Array<{text: string}>
        markDefs: Array<unknown>
      }
      expect(block.children[0].text).toEqual('[foo](bar)')
      expect(block.markDefs).toEqual([])

      const selection = editor.getSnapshot().context.selection
      expect(selection?.anchor.offset).toEqual(10)
      expect(selection?.focus.offset).toEqual(10)
    })
  })
})

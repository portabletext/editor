import {defineContainer, defineSchema} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
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

    const codeBlockContainer = defineContainer<typeof schemaDefinition>({
      scope: '$..code-block',
      field: 'lines',
      render: ({attributes, children}) => (
        <pre data-testid="code-block" {...attributes}>
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
          <ContainerPlugin containers={[codeBlockContainer]} />
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

    const codeBlockContainer = defineContainer<typeof schemaDefinition>({
      scope: '$..code-block',
      field: 'lines',
      render: ({attributes, children}) => (
        <pre data-testid="code-block" {...attributes}>
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
          <ContainerPlugin containers={[codeBlockContainer]} />
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
})

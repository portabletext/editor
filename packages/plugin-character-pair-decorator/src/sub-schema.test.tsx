import {defineContainer, defineSchema} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {CharacterPairDecoratorPlugin} from './plugin.character-pair-decorator'

describe('Character pair decorator respects the sub-schema at the focus', () => {
  test('typing `*foo*` inside a code-block-line does not toggle em', async () => {
    const schemaDefinition = defineSchema({
      decorators: [{name: 'em'}, {name: 'strong'}],
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
      type: 'code-block',
      childField: 'lines',
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
          <CharacterPairDecoratorPlugin
            pair={{char: '*', amount: 1}}
            decorator={({context}) =>
              context.schema.decorators.find(
                (decorator) => decorator.name === 'em',
              )?.name
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
    await userEvent.keyboard('*foo*')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: 'cb1',
          lines: [
            {
              _type: 'block',
              _key: 'l1',
              children: [{_type: 'span', _key: 's1', text: '*foo*', marks: []}],
              markDefs: [],
              style: 'code',
            },
          ],
        },
      ])
    })
  })
})

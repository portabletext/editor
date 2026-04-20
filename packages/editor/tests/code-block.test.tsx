import {diffMatchPatch} from '@portabletext/patches'
import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {Patch} from '../src'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {EventListenerPlugin} from '../src/plugins/plugin.event-listener'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  blockObjects: [
    {
      name: 'code-block',
      fields: [
        {
          name: 'lines',
          type: 'array',
          of: [{type: 'block'}],
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

describe('code block', () => {
  test('clicking into a code block and typing a character', async () => {
    const keyGenerator = createTestKeyGenerator()
    const codeBlockKey = keyGenerator()
    const lineKey = keyGenerator()
    const spanKey = keyGenerator()

    const patches: Array<Patch> = []

    const {editor} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: '',
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
        <>
          <ContainerPlugin containers={[{container: codeBlockContainer}]} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'mutation') {
                for (const patch of event.patches) {
                  const {origin: _, ...rawPatch} = patch
                  patches.push(rawPatch)
                }
              }
            }}
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
    await userEvent.keyboard('a')

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.value).toEqual([
        {
          _type: 'code-block',
          _key: codeBlockKey,
          lines: [
            {
              _type: 'block',
              _key: lineKey,
              children: [
                {
                  _type: 'span',
                  _key: spanKey,
                  text: 'a',
                  marks: [],
                },
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ])

      expect(patches).toEqual([
        diffMatchPatch('', 'a', [
          {_key: codeBlockKey},
          'lines',
          {_key: lineKey},
          'children',
          {_key: spanKey},
          'text',
        ]),
      ])
    })
  })
})

import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {expect, test, vi} from 'vitest'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

test('a block object declared only inside a container renders without a schema error', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

  await createTestEditor({
    keyGenerator: createTestKeyGenerator(),
    schemaDefinition: defineSchema({
      blockObjects: [
        {
          name: 'callout',
          fields: [
            {
              name: 'content',
              type: 'array',
              of: [
                {type: 'block'},
                {type: 'object', name: 'embed', fields: []},
              ],
            },
          ],
        },
      ],
    }),
    initialValue: [
      {
        _type: 'callout',
        _key: 'c0',
        content: [{_type: 'embed', _key: 'e0'}],
      },
    ],
    children: (
      <NodePlugin
        nodes={[
          defineContainer({
            type: 'callout',
            arrayField: 'content',
            render: ({attributes, children}) => (
              <div data-testid="callout" {...attributes}>
                {children}
              </div>
            ),
          }),
        ]}
      />
    ),
  })

  await vi.waitFor(() => {
    expect(document.querySelector('[data-testid="callout"]')).not.toEqual(null)
    expect(document.querySelector('[data-pt-block="object"]')).not.toEqual(null)
  })

  expect(consoleError.mock.calls).toEqual([])
  consoleError.mockRestore()
})

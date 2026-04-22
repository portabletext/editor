import {defineContainer, defineSchema} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {createTestEditor} from '@portabletext/editor/test/vitest'
import {userEvent} from '@vitest/browser/context'
import {describe, expect, test} from 'vitest'
import {MarkdownShortcutsPlugin} from './plugin.markdown-shortcuts'

const schemaDefinition = defineSchema({
  styles: [{name: 'normal'}, {name: 'h1'}],
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
              styles: [{name: 'monospace'}],
              decorators: [],
              annotations: [],
              lists: [],
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
  render: () => null,
})

describe('clearStyleOnBackspace inside an editable container', () => {
  test('does not consume Backspace when container sub-schema lacks the default style', async () => {
    const {editor, locator} = await createTestEditor({
      schemaDefinition,
      initialValue: [
        {
          _key: 'cb0',
          _type: 'code-block',
          lines: [
            {
              _key: 'b0',
              _type: 'block',
              children: [{_key: 's0', _type: 'span', text: 'foo', marks: []}],
              markDefs: [],
              style: 'monospace',
            },
            {
              _key: 'b1',
              _type: 'block',
              children: [{_key: 's1', _type: 'span', text: 'bar', marks: []}],
              markDefs: [],
              style: 'monospace',
            },
          ],
        },
      ],
      children: (
        <>
          <ContainerPlugin containers={[codeBlockContainer]} />
          <MarkdownShortcutsPlugin
            defaultStyle={({context}) => context.schema.styles[0]?.name}
          />
        </>
      ),
    })

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {
          path: [
            {_key: 'cb0'},
            'lines',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 0,
        },
        focus: {
          path: [
            {_key: 'cb0'},
            'lines',
            {_key: 'b1'},
            'children',
            {_key: 's1'},
          ],
          offset: 0,
        },
      },
    })
    await userEvent.keyboard('{Backspace}')

    const value = editor.getSnapshot().context.value
    expect(value).toEqual([
      {
        _key: 'cb0',
        _type: 'code-block',
        lines: [
          {
            _key: 'b0',
            _type: 'block',
            children: [{_key: 's0', _type: 'span', text: 'foobar', marks: []}],
            markDefs: [],
            style: 'monospace',
          },
        ],
      },
    ])
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {page, userEvent} from '@vitest/browser/context'
import React from 'react'
import {describe, expect, test, vi} from 'vitest'
import {render} from 'vitest-browser-react'
import {
  defineSchema,
  EditorProvider,
  PortableTextEditable,
  type BlockChildRenderProps,
  type Editor,
} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'

describe('renderChild', () => {
  test('focused and selected props', async () => {
    const editorRef = React.createRef<Editor>()
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const renderChildValues: Array<
      Pick<BlockChildRenderProps, 'focused' | 'selected'>
    > = []

    const renderChild = (props: BlockChildRenderProps) => {
      if (props.value._key === barSpanKey) {
        renderChildValues.push({
          focused: props.focused,
          selected: props.selected,
        })
      }
      return props.children
    }

    render(
      <EditorProvider
        initialConfig={{
          keyGenerator,
          initialValue: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: fooSpanKey, text: 'foo '},
                {
                  _type: 'span',
                  _key: barSpanKey,
                  text: 'bar',
                  marks: ['strong'],
                },
                {_type: 'span', _key: bazSpanKey, text: ' baz'},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
          schemaDefinition: defineSchema({
            decorators: [{name: 'strong'}],
          }),
        }}
      >
        <EditorRefPlugin ref={editorRef} />
        <PortableTextEditable renderChild={renderChild} />
      </EditorProvider>,
    )

    const locator = page.getByRole('textbox')
    await vi.waitFor(() => expect.element(locator).toBeInTheDocument())

    await userEvent.click(locator)
    editorRef.current?.send({
      type: 'select',
      at: {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
      },
    })
    await vi.waitFor(() => {
      expect(editorRef.current?.getSnapshot().context.selection).toEqual({
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: fooSpanKey}],
          offset: 4,
        },
        backward: false,
      })
    })

    expect(renderChildValues).toEqual([{focused: false, selected: false}])

    // Cursor is now at "foo b|ar baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is now considered both focused and selected
    await vi.waitFor(() => {
      expect(renderChildValues.slice(1)).toEqual([
        {focused: true, selected: true},
      ])
    })

    // Cursor is now at "foo ba|r baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderChildValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar| baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderChildValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar |baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is no longer focused or selected
    await vi.waitFor(() => {
      expect(renderChildValues.slice(2)).toEqual([
        {focused: false, selected: false},
      ])
    })
  })
})

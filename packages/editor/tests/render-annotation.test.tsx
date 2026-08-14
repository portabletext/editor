import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  defineTextBlock,
  type BlockAnnotationRenderProps,
} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

describe('renderAnnotation', () => {
  test('focused and selected props', async () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()
    const linkKey = keyGenerator()

    const renderAnnotationValues: Array<
      Pick<BlockAnnotationRenderProps, 'focused' | 'selected'>
    > = []

    const renderAnnotation = (props: BlockAnnotationRenderProps) => {
      renderAnnotationValues.push({
        focused: props.focused,
        selected: props.selected,
      })
      return props.children
    }

    const {editor, locator} = await createTestEditor({
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
              marks: [linkKey],
            },
            {_type: 'span', _key: bazSpanKey, text: ' baz'},
          ],
          markDefs: [
            {_type: 'link', _key: linkKey, href: 'https://example.com'},
          ],
          style: 'normal',
        },
      ],
      schemaDefinition: defineSchema({
        annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      }),
      editableProps: {renderAnnotation},
    })

    await userEvent.click(locator)
    editor.send({
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
      expect(editor.getSnapshot().context.selection).toEqual({
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

    expect(renderAnnotationValues).toEqual([{focused: false, selected: false}])

    // Cursor is now at "foo b|ar baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is now considered both focused and selected
    await vi.waitFor(() => {
      expect(renderAnnotationValues.slice(1)).toEqual([
        {focused: true, selected: true},
      ])
    })

    // Cursor is now at "foo ba|r baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderAnnotationValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar| baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderAnnotationValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar |baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is no longer focused or selected
    await vi.waitFor(() => {
      expect(renderAnnotationValues.slice(2)).toEqual([
        {focused: false, selected: false},
      ])
    })
  })

  test('composes inside a registered text block', async () => {
    const schema = defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
    })
    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const renderAnnotation = vi.fn(({children}) => (
      <a href="https://x">{children}</a>
    ))

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'linked', marks: ['m1']},
          ],
          markDefs: [{_key: 'm1', _type: 'link', href: 'https://x'}],
          style: 'normal',
        },
      ],
      editableProps: {renderAnnotation},
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      expect(root!.innerHTML).toContain('<a href="https://x">')
    })

    expect(renderAnnotation).toHaveBeenCalled()
  })
})

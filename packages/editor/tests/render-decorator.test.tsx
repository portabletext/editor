import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {
  defineSchema,
  defineTextBlock,
  type BlockDecoratorRenderProps,
} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'

describe('renderDecorator', () => {
  test('focused and selected props', async () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const fooSpanKey = keyGenerator()
    const barSpanKey = keyGenerator()
    const bazSpanKey = keyGenerator()

    const renderDecoratorValues: Array<
      Pick<BlockDecoratorRenderProps, 'focused' | 'selected'>
    > = []

    const renderDecorator = (props: BlockDecoratorRenderProps) => {
      renderDecoratorValues.push({
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
      editableProps: {renderDecorator},
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

    expect(renderDecoratorValues).toEqual([{focused: false, selected: false}])

    // Cursor is now at "foo b|ar baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is now considered both focused and selected
    await vi.waitFor(() => {
      expect(renderDecoratorValues.slice(1)).toEqual([
        {focused: true, selected: true},
      ])
    })

    // Cursor is now at "foo ba|r baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderDecoratorValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar| baz"
    await userEvent.keyboard('{ArrowRight}')
    // No change in the focused and selected state
    await vi.waitFor(() => {
      expect(renderDecoratorValues.slice(2)).toEqual([])
    })

    // Cursor is now at "foo bar |baz"
    await userEvent.keyboard('{ArrowRight}')
    // The annotation is no longer focused or selected
    await vi.waitFor(() => {
      expect(renderDecoratorValues.slice(2)).toEqual([
        {focused: false, selected: false},
      ])
    })
  })

  test('composes inside a registered text block', async () => {
    const schema = defineSchema({
      decorators: [{name: 'strong'}],
    })
    const textBlock = defineTextBlock({
      type: 'block',
      render: ({attributes, children}) => (
        <div data-testid="text" {...attributes}>
          {children}
        </div>
      ),
    })
    const renderDecorator = vi.fn(({children}) => <strong>{children}</strong>)

    await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: schema,
      initialValue: [
        {
          _key: 'b0',
          _type: 'block',
          children: [
            {_key: 's0', _type: 'span', text: 'bold text', marks: ['strong']},
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      editableProps: {renderDecorator},
      children: <NodePlugin nodes={[textBlock]} />,
    })

    await vi.waitFor(() => {
      const root = document.querySelector('[data-testid="text"]')
      expect(root).not.toEqual(null)
      expect(root!.innerHTML).toContain('<strong>')
    })

    expect(renderDecorator).toHaveBeenCalled()
  })
})

import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineSchema, type BlockChildRenderProps} from '../src'
import {createTestEditor} from '../src/test/vitest'

describe('renderChild', () => {
  test('span focused and selected props', async () => {
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
      editableProps: {renderChild},
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

  test('inline object focused and selected props', async () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const fooKey = keyGenerator()
    const imageKey = keyGenerator()
    const barKey = keyGenerator()

    const renderChildValues: Array<
      Pick<BlockChildRenderProps, 'focused' | 'selected'>
    > = []

    const renderChild = (props: BlockChildRenderProps) => {
      if (props.value._key === imageKey) {
        renderChildValues.push({
          focused: props.focused,
          selected: props.selected,
        })
      }
      return props.children
    }

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      initialValue: [
        {
          _type: 'block',
          _key: blockKey,
          children: [
            {_type: 'span', _key: fooKey, text: 'foo'},
            {_type: 'image', _key: imageKey},
            {_type: 'span', _key: barKey, text: 'bar'},
          ],
        },
      ],
      schemaDefinition: defineSchema({
        inlineObjects: [{name: 'image'}],
      }),
      editableProps: {renderChild},
    })

    await userEvent.click(locator)

    const initialSelection = {
      anchor: {
        path: [{_key: blockKey}, 'children', {_key: imageKey}],
        offset: 0,
      },
      focus: {
        path: [{_key: blockKey}, 'children', {_key: imageKey}],
        offset: 0,
      },
      backward: false,
    }

    editor.send({
      type: 'select',
      at: initialSelection,
    })

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual(initialSelection)
    })

    expect(renderChildValues).toEqual([
      {
        focused: false,
        selected: false,
      },
      {
        focused: true,
        selected: true,
      },
    ])
  })
})

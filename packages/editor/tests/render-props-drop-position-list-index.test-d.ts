import {expectTypeOf, test} from 'vitest'
import {
  defineBlockObject,
  defineTextBlock,
} from '../src/renderers/renderer.types'

test('TextBlockRenderProps exposes optional listIndex: number', () => {
  defineTextBlock({
    type: '*',
    render: (props) => {
      expectTypeOf(props.listIndex).toEqualTypeOf<number | undefined>()
      return props.renderDefault(props)
    },
  })
})

test('TextBlockRenderProps exposes optional dropPosition', () => {
  defineTextBlock({
    type: '*',
    render: (props) => {
      expectTypeOf(props.dropPosition).toEqualTypeOf<
        'start' | 'end' | undefined
      >()
      return props.renderDefault(props)
    },
  })
})

test('BlockObjectRenderProps exposes optional dropPosition', () => {
  defineBlockObject({
    type: '*',
    render: (props) => {
      expectTypeOf(props.dropPosition).toEqualTypeOf<
        'start' | 'end' | undefined
      >()
      return props.renderDefault(props)
    },
  })
})

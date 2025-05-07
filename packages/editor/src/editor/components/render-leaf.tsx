import {useSelector} from '@xstate/react'
import {useContext, type CSSProperties} from 'react'
import type {Text} from 'slate'
import type {RenderLeafProps} from 'slate-react'
import type {
  RangeDecoration,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderPlaceholderFunction,
} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'
import {RenderSpan} from './render-span'

const PLACEHOLDER_STYLE: CSSProperties = {
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
  left: 0,
  right: 0,
}

export function RenderLeaf(
  props: RenderLeafProps & {
    leaf: Text & {placeholder?: boolean; rangeDecoration?: RangeDecoration}
    readOnly: boolean
    renderAnnotation?: RenderAnnotationFunction
    renderChild?: RenderChildFunction
    renderDecorator?: RenderDecoratorFunction
    renderPlaceholder?: RenderPlaceholderFunction
  },
) {
  const editorActor = useContext(EditorActorContext)
  const schema = useSelector(editorActor, (s) => s.context.schema)

  if (props.leaf._type !== schema.span.name) {
    return props.children
  }

  let renderedSpan = <RenderSpan {...props} />

  if (
    props.renderPlaceholder &&
    props.leaf.placeholder &&
    props.text.text === ''
  ) {
    return (
      <>
        <span style={PLACEHOLDER_STYLE} contentEditable={false}>
          {props.renderPlaceholder()}
        </span>
        {renderedSpan}
      </>
    )
  }

  const rangeDecoration = props.leaf.rangeDecoration

  if (rangeDecoration) {
    renderedSpan = rangeDecoration.component({children: renderedSpan})
  }

  return renderedSpan
}

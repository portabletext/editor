import type {PortableTextSpan} from '@portabletext/schema'
import type {CSSProperties} from 'react'
import type {RenderLeafProps} from '../slate/react/components/editable'
import type {
  RangeDecoration,
  RenderAnnotationFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderPlaceholderFunction,
} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {RenderSpan} from './render.span'

const PLACEHOLDER_STYLE: CSSProperties = {
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
  left: 0,
  right: 0,
}

export function RenderLeaf(
  props: RenderLeafProps & {
    leaf: PortableTextSpan & {
      placeholder?: boolean
      rangeDecoration?: RangeDecoration
    }
    readOnly: boolean
    renderAnnotation?: RenderAnnotationFunction
    renderChild?: RenderChildFunction
    renderDecorator?: RenderDecoratorFunction
    renderPlaceholder?: RenderPlaceholderFunction
    schema: EditorSchema
  },
) {
  const schema = props.schema

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

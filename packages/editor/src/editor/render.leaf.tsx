import type {PortableTextSpan} from '@portabletext/schema'
import type {CSSProperties} from 'react'
import type {RenderLeafProps} from '../engine/react/components/editable'
import type {RenderPlaceholderFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {LeafRangeDecoration} from './range-decorations-machine'
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
      rangeDecorations?: Array<LeafRangeDecoration>
    }
    readOnly: boolean
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

  const rangeDecorations = props.leaf.rangeDecorations

  if (rangeDecorations) {
    for (const entry of [...rangeDecorations].reverse()) {
      if (entry.kind === 'registered') {
        renderedSpan = entry.rangeDecoration.render({
          children: renderedSpan,
          isFirst: entry.isFirst,
          isLast: entry.isLast,
        })
      } else {
        renderedSpan = entry.rangeDecoration.component({children: renderedSpan})
      }
    }
  }

  return renderedSpan
}

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
  marginTop: '-1lh',
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
    // The placeholder goes after the span. Before it, Chrome counts its text
    // as text before the caret and reports that offset to the IME, so
    // Gboard on Android reads the empty block as mid-sentence and turns
    // Shift off for the first word.
    return (
      <>
        {renderedSpan}
        <span style={PLACEHOLDER_STYLE} contentEditable={false}>
          {props.renderPlaceholder()}
        </span>
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

  // Same shape as the placeholder branch above, with an empty last slot, so
  // the first character typed into an empty block updates the span in place
  // instead of remounting it. On Android a remount takes away the text node
  // the IME composes in.
  return (
    <>
      {renderedSpan}
      {null}
    </>
  )
}

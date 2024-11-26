import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelectionPoint} from '../../types/editor'
import {getSelectionText} from './behavior.utils.get-selection-text'
import {getStartPoint} from './behavior.utils.get-start-point'
import {isKeyedSegment} from './behavior.utils.is-keyed-segment'

export function getBlockTextBefore({
  value,
  point,
}: {
  value: Array<PortableTextBlock>
  point: EditorSelectionPoint
}) {
  const key = isKeyedSegment(point.path[0]) ? point.path[0]._key : undefined

  const block = key ? value.find((block) => block._key === key) : undefined

  if (!block) {
    return ''
  }

  const startPoint = getStartPoint({node: block, path: [{_key: block._key}]})

  return getSelectionText({
    value,
    selection: {
      anchor: startPoint,
      focus: point,
    },
  })
}

import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '..'
import type {BlockOffset} from '../types/block-offset'
import {blockOffsetToSpanSelectionPoint} from './util.block-offset'

/**
 * @public
 */
export function blockOffsetsToSelection({
  value,
  offsets,
  backward,
}: {
  value: Array<PortableTextBlock>
  offsets: {anchor: BlockOffset; focus: BlockOffset}
  backward?: boolean
}): EditorSelection {
  const anchor = blockOffsetToSpanSelectionPoint({
    value,
    blockOffset: offsets.anchor,
    direction: backward ? 'backward' : 'forward',
  })
  const focus = blockOffsetToSpanSelectionPoint({
    value,
    blockOffset: offsets.focus,
    direction: backward ? 'forward' : 'backward',
  })

  if (!anchor || !focus) {
    return null
  }

  return {
    anchor,
    focus,
    backward,
  }
}

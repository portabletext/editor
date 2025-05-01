import type {EditorSelection} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import {blockOffsetToSelectionPoint} from './util.block-offset-to-selection-point'

/**
 * @public
 */
export function blockOffsetsToSelection({
  context,
  offsets,
  backward,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  offsets: {anchor: BlockOffset; focus: BlockOffset}
  backward?: boolean
}): EditorSelection {
  const anchor = blockOffsetToSelectionPoint({
    context,
    blockOffset: offsets.anchor,
    direction: backward ? 'backward' : 'forward',
  })
  const focus = blockOffsetToSelectionPoint({
    context,
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

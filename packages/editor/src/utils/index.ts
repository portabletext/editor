export type {BlockOffset} from '../behaviors/behavior.types'
export type {EditorSelection, EditorSelectionPoint} from '../types/editor'
export {
  blockOffsetToSpanSelectionPoint,
  spanSelectionPointToBlockOffset,
} from './util.block-offset'
export {getBlockEndPoint} from './util.get-block-end-point'
export {getBlockStartPoint} from './util.get-block-start-point'
export {getTextBlockText} from './util.get-text-block-text'
export {isEmptyTextBlock} from './util.is-empty-text-block'
export {isEqualSelectionPoints} from './util.is-equal-selection-points'
export {isKeyedSegment} from './util.is-keyed-segment'
export {reverseSelection} from './util.reverse-selection'
export {sliceBlocks} from './util.slice-blocks'

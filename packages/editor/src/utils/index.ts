export type {BlockOffset} from '../behaviors/behavior.types'
export type {EditorSelection, EditorSelectionPoint} from '../types/editor'
export {
  blockOffsetToSpanSelectionPoint,
  spanSelectionPointToBlockOffset,
} from './util.block-offset'
export {getBlockStartPoint} from './util.get-block-start-point'
export {getTextBlockText} from './util.get-text-block-text'
export {isEmptyTextBlock} from './util.is-empty-text-block'
export {isKeyedSegment} from './util.is-keyed-segment'
export {reverseSelection} from './util.reverse-selection'

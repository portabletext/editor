export type {EditorSelector} from '../editor/editor-selector'
export type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
export type {
  EditorSelection,
  EditorSelectionPoint,
  PortableTextMemberSchemaTypes,
} from '../types/editor'

export type {EditorSchema} from '../editor/define-schema'
export {getActiveListItem} from './selector.get-active-list-item'
export {getActiveStyle} from './selector.get-active-style'
export {getSelectedSlice} from './selector.get-selected-slice'
export {getSelectedSpans} from './selector.get-selected-spans'
export {getSelectionText} from './selector.get-selection-text'
export {getBlockTextBefore} from './selector.get-text-before'
export {isActiveAnnotation} from './selector.is-active-annotation'
export {isActiveDecorator} from './selector.is-active-decorator'
export {isActiveListItem} from './selector.is-active-list-item'
export {isActiveStyle} from './selector.is-active-style'
export {isAtTheEndOfBlock} from './selector.is-at-the-end-of-block'
export {isAtTheStartOfBlock} from './selector.is-at-the-start-of-block'
export {isPointAfterSelection} from './selector.is-point-after-selection'
export {isPointBeforeSelection} from './selector.is-point-before-selection'
export {isSelectionCollapsed} from './selector.is-selection-collapsed'
export {isSelectionExpanded} from './selector.is-selection-expanded'
export * from './selectors'

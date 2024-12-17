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
export {getSelectedSpans} from './selector.get-selected-spans'
export {getSelectionText} from './selector.get-selection-text'
export {getBlockTextBefore} from './selector.get-text-before'
export {isActiveAnnotation} from './selector.is-active-annotation'
export {isActiveDecorator} from './selector.is-active-decorator'
export {isActiveListItem} from './selector.is-active-list-item'
export {isActiveStyle} from './selector.is-active-style'
export {isSelectionCollapsed} from './selector.is-selection-collapsed'
export {isSelectionExpanded} from './selector.is-selection-expanded'
export * from './selectors'

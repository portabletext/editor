import {DOMEditor, type DOMEditorInterface} from '../../dom/plugin/dom-editor'

/**
 * A React and DOM-specific version of the `Editor` interface.
 */

export interface ReactEditor extends DOMEditor {}

export interface ReactEditorInterface extends DOMEditorInterface {}

// eslint-disable-next-line no-redeclare
export const ReactEditor: ReactEditorInterface = DOMEditor

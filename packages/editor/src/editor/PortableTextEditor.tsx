import type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  Schema,
} from '@portabletext/schema'
import type {
  AddedAnnotationPaths,
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorSelection,
} from '../types/editor'
import type {Path} from '../types/paths'
import type {InternalEditor} from './create-editor'

/**
 * @public
 * @deprecated Use `useEditor()` instead
 *
 * ```
 * import {useEditor} from '@portabletext/editor'
 *
 * // Get the editor instance
 * const editor = useEditor()
 *
 * // Send events to the editor
 * editor.send(...)
 *
 * // Derive state from the editor
 * const state = useEditorSelector(editor, snapshot => ...)
 * ```
 */
export class PortableTextEditor {
  /**
   * A lookup table for all the relevant schema types for this portable text type.
   */
  public schemaTypes: Schema
  /**
   * The editor instance
   */
  private editor: InternalEditor
  /*
   * The editor API (currently implemented with Slate).
   */
  private editable: EditableAPI

  constructor(config: {editor: InternalEditor}) {
    this.editor = config.editor
    this.schemaTypes =
      config.editor._internal.editorActor.getSnapshot().context.schema
    this.editable = config.editor._internal.editable
  }

  public setEditable = (editable: EditableAPI) => {
    this.editor._internal.editable = {
      ...this.editor._internal.editable,
      ...editable,
    }
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.getActiveAnnotations)
   * ```
   */
  static activeAnnotations = (
    editor: PortableTextEditor,
  ): PortableTextObject[] => {
    return editor && editor.editable ? editor.editable.activeAnnotations() : []
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveAnnotation(...))
   * ```
   */
  static isAnnotationActive = (
    editor: PortableTextEditor,
    annotationType: PortableTextObject['_type'],
  ): boolean => {
    return editor && editor.editable
      ? editor.editable.isAnnotationActive(annotationType)
      : false
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'annotation.add',
   *  annotation: {
   *    name: '...',
   *    value: {...},
   *  }
   * })
   * ```
   */
  static addAnnotation = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): AddedAnnotationPaths | undefined =>
    editor.editable?.addAnnotation(type, value)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'blur',
   * })
   * ```
   */
  static blur = (editor: PortableTextEditor): void => {
    editor.editable?.blur()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'delete',
   *  at: {...},
   *  direction: '...',
   *  unit: '...',
   * })
   * ```
   */
  static delete = (
    editor: PortableTextEditor,
    selection: EditorSelection,
    options?: EditableAPIDeleteOptions,
  ) => editor.editable?.delete(selection, options)

  static findDOMNode = (
    editor: PortableTextEditor,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.findDOMNode(element)
  }

  static findByPath = (editor: PortableTextEditor, path: Path) => {
    return editor.editable?.findByPath(path) || []
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'focus',
   * })
   * ```
   */
  static focus = (editor: PortableTextEditor): void => {
    editor.editable?.focus()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const focusBlock = useEditorSelector(editor, selectors.getFocusBlock)
   * ```
   */
  static focusBlock = (editor: PortableTextEditor) => {
    return editor.editable?.focusBlock()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const focusChild = useEditorSelector(editor, selectors.getFocusChild)
   * ```
   */
  static focusChild = (
    editor: PortableTextEditor,
  ): PortableTextChild | undefined => {
    return editor.editable?.focusChild()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const selection = useEditorSelector(editor, selectors.getSelection)
   * ```
   */
  static getSelection = (editor: PortableTextEditor) => {
    return editor.editable ? editor.editable.getSelection() : null
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const value = useEditorSelector(editor, selectors.getValue)
   * ```
   */
  static getValue = (editor: PortableTextEditor) => {
    return editor.editable?.getValue()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveStyle(...))
   * ```
   */
  static hasBlockStyle = (editor: PortableTextEditor, blockStyle: string) => {
    return editor.editable?.hasBlockStyle(blockStyle)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveListItem(...))
   * ```
   */
  static hasListStyle = (editor: PortableTextEditor, listStyle: string) => {
    return editor.editable?.hasListStyle(listStyle)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isSelectionCollapsed = useEditorSelector(editor, selectors.isSelectionCollapsed)
   * ```
   */
  static isCollapsedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isCollapsedSelection()

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isSelectionExpanded = useEditorSelector(editor, selectors.isSelectionExpanded)
   * ```
   */
  static isExpandedSelection = (editor: PortableTextEditor) =>
    editor.editable?.isExpandedSelection()

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isActive = useEditorSelector(editor, selectors.isActiveDecorator(...))
   * ```
   */
  static isMarkActive = (editor: PortableTextEditor, mark: string) =>
    editor.editable?.isMarkActive(mark)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.span',
   *  text: '...',
   *  annotations: [{name: '...', value: {...}}],
   *  decorators: ['...'],
   * })
   * editor.send({
   *  type: 'insert.inline object',
   *  inlineObject: {
   *    name: '...',
   *    value: {...},
   *  },
   * })
   * ```
   */
  static insertChild = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    return editor.editable?.insertChild(type, value)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.block object',
   *  blockObject: {
   *    name: '...',
   *    value: {...},
   *  },
   *  placement: 'auto' | 'after' | 'before',
   * })
   * ```
   */
  static insertBlock = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ): Path | undefined => {
    return editor.editable?.insertBlock(type, value)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'insert.break',
   * })
   * ```
   */
  static insertBreak = (editor: PortableTextEditor): void => {
    return editor.editable?.insertBreak()
  }

  static isVoid = (
    editor: PortableTextEditor,
    element: PortableTextBlock | PortableTextChild,
  ) => {
    return editor.editable?.isVoid(element)
  }

  static isObjectPath = (_editor: PortableTextEditor, path: Path): boolean => {
    if (!path || !Array.isArray(path)) {
      return false
    }
    const isChildObjectEditPath = path.length > 3 && path[1] === 'children'
    const isBlockObjectEditPath = path.length > 1 && path[1] !== 'children'
    return isBlockObjectEditPath || isChildObjectEditPath
  }

  static marks = (editor: PortableTextEditor) => {
    return editor.editable?.marks()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'select',
   *  selection: {...},
   * })
   * ```
   */
  static select = (
    editor: PortableTextEditor,
    selection: EditorSelection | null,
  ) => {
    editor.editable?.select(selection)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'annotation.remove',
   *  annotation: {
   *    name: '...',
   *  },
   * })
   * ```
   */
  static removeAnnotation = <TSchemaType extends {name: string}>(
    editor: PortableTextEditor,
    type: TSchemaType,
  ) => editor.editable?.removeAnnotation(type)

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'style.toggle',
   *  style: '...',
   * })
   * ```
   */
  static toggleBlockStyle = (
    editor: PortableTextEditor,
    blockStyle: string,
  ) => {
    return editor.editable?.toggleBlockStyle(blockStyle)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'list item.toggle',
   *  listItem: '...',
   * })
   * ```
   */
  static toggleList = (editor: PortableTextEditor, listStyle: string): void => {
    return editor.editable?.toggleList(listStyle)
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *  type: 'decorator.toggle',
   *  decorator: '...',
   * })
   * ```
   */
  static toggleMark = (editor: PortableTextEditor, mark: string): void => {
    editor.editable?.toggleMark(mark)
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const selectedValue = useEditorSelector(editor, selectors.getSelectedValue)
   * ```
   */
  static getFragment = (
    editor: PortableTextEditor,
  ): PortableTextBlock[] | undefined => {
    return editor.editable?.getFragment()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *   type: 'history.undo',
   * })
   * ```
   */
  static undo = (editor: PortableTextEditor): void => {
    editor.editable?.undo()
  }

  /**
   * @deprecated
   * Use `editor.send(...)` instead
   *
   * ```
   * const editor = useEditor()
   * editor.send({
   *   type: 'history.redo',
   * })
   * ```
   */
  static redo = (editor: PortableTextEditor): void => {
    editor.editable?.redo()
  }

  /**
   * @deprecated
   * Use built-in selectors or write your own: https://www.portabletext.org/reference/selectors/
   *
   * ```
   * import * as selectors from '@portabletext/editor/selectors'
   * const editor = useEditor()
   * const isOverlapping = useEditorSelector(editor, selectors.isOverlappingSelection(selectionB))
   * ```
   */
  static isSelectionsOverlapping = (
    editor: PortableTextEditor,
    selectionA: EditorSelection,
    selectionB: EditorSelection,
  ) => {
    return editor.editable?.isSelectionsOverlapping(selectionA, selectionB)
  }
}

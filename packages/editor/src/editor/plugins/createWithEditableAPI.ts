import {isTextBlock} from '@portabletext/schema'
import type {
  Path,
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
} from '@sanity/types'
import {Editor, Range, Text, Transforms} from 'slate'
import {ReactEditor} from 'slate-react'
import {
  isListItemActive,
  isStyleActive,
  slateRangeToSelection,
} from '../../internal-utils/slate-utils'
import {toSlateRange} from '../../internal-utils/to-slate-range'
import {getActiveAnnotationsMarks} from '../../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../../selectors/selector.get-active-decorators'
import {getFocusBlock} from '../../selectors/selector.get-focus-block'
import {getFocusSpan} from '../../selectors/selector.get-focus-span'
import {getSelectedValue} from '../../selectors/selector.get-selected-value'
import {isActiveAnnotation} from '../../selectors/selector.is-active-annotation'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorSelection,
} from '../../types/editor'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../../utils/util.selection-point'
import type {EditorActor} from '../editor-machine'
import {getEditorSnapshot} from '../editor-selector'
import {SLATE_TO_PORTABLE_TEXT_RANGE} from '../weakMaps'

export function createEditableAPI(
  editor: PortableTextSlateEditor,
  editorActor: EditorActor,
) {
  const types = editorActor.getSnapshot().context.schema

  const editableApi: EditableAPI = {
    focus: (): void => {
      editorActor.send({
        type: 'focus',
        editor,
      })
    },
    blur: (): void => {
      editorActor.send({
        type: 'blur',
        editor,
      })
    },
    toggleMark: (mark: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'decorator.toggle',
          decorator: mark,
        },
        editor,
      })
    },
    toggleList: (listItem: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'list item.toggle',
          listItem,
        },
        editor,
      })
    },
    toggleBlockStyle: (style: string): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'style.toggle',
          style,
        },
        editor,
      })
    },
    isMarkActive: (mark: string): boolean => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })

      const activeDecorators = getActiveDecorators(snapshot)

      return activeDecorators.includes(mark)
    },
    marks: (): string[] => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })

      const activeAnnotations = getActiveAnnotationsMarks(snapshot)
      const activeDecorators = getActiveDecorators(snapshot)

      return [...activeAnnotations, ...activeDecorators]
    },
    undo: (): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.undo',
        },
        editor,
      })
    },
    redo: (): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.redo',
        },
        editor,
      })
    },
    select: (selection: EditorSelection): void => {
      const slateSelection = toSlateRange({
        context: {
          schema: editorActor.getSnapshot().context.schema,
          value: editor.value,
          selection,
        },
        blockIndexMap: editor.blockIndexMap,
      })

      if (slateSelection) {
        Transforms.select(editor, slateSelection)
      } else {
        Transforms.deselect(editor)
      }

      editor.onChange()
    },
    focusBlock: (): PortableTextBlock | undefined => {
      if (!editor.selection) {
        return undefined
      }

      const focusBlockIndex = editor.selection.focus.path.at(0)

      if (focusBlockIndex === undefined) {
        return undefined
      }

      return editor.value.at(focusBlockIndex)
    },
    focusChild: (): PortableTextChild | undefined => {
      if (!editor.selection) {
        return undefined
      }

      const focusBlockIndex = editor.selection.focus.path.at(0)
      const focusChildIndex = editor.selection.focus.path.at(1)

      const block =
        focusBlockIndex !== undefined
          ? editor.value.at(focusBlockIndex)
          : undefined

      if (!block) {
        return undefined
      }

      if (isTextBlock(editorActor.getSnapshot().context, block)) {
        if (focusChildIndex === undefined) {
          return undefined
        }

        return block.children.at(focusChildIndex)
      }

      return undefined
    },
    insertChild: <TSchemaType extends {name: string}>(
      type: TSchemaType,
      value?: {[prop: string]: any},
    ): Path => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.child',
          child: {
            _type: type.name,
            ...(value ? value : {}),
          },
        },
        editor,
      })

      return editor.selection
        ? (slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range: editor.selection,
          })?.focus.path ?? [])
        : []
    },
    insertBlock: <TSchemaType extends {name: string}>(
      type: TSchemaType,
      value?: {[prop: string]: any},
    ): Path => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.block',
          block: {
            _type: type.name,
            ...(value ? value : {}),
          },
          placement: 'auto',
        },
        editor,
      })

      return editor.selection
        ? (slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range: editor.selection,
          })?.focus.path ?? [])
        : []
    },
    hasBlockStyle: (style: string): boolean => {
      try {
        return isStyleActive({editor, style})
      } catch {
        // This is fine.
        return false
      }
    },
    hasListStyle: (listItem: string): boolean => {
      try {
        return isListItemActive({editor, listItem})
      } catch {
        // This is fine.
        return false
      }
    },
    isVoid: (element: PortableTextBlock | PortableTextChild) => {
      return ![types.block.name, types.span.name].includes(element._type)
    },
    findByPath: (
      path: Path,
    ): [
      PortableTextBlock | PortableTextChild | undefined,
      Path | undefined,
    ] => {
      const blockKey = getBlockKeyFromSelectionPoint({path, offset: 0})

      if (!blockKey) {
        return [undefined, undefined]
      }

      const blockIndex = editor.blockIndexMap.get(blockKey)

      if (blockIndex === undefined) {
        return [undefined, undefined]
      }

      const block = editor.value.at(blockIndex)

      if (!block) {
        return [undefined, undefined]
      }

      const childKey = getChildKeyFromSelectionPoint({path, offset: 0})

      if (path.length === 1 && !childKey) {
        return [block, [{_key: block._key}]]
      }

      if (isTextBlock(editorActor.getSnapshot().context, block) && childKey) {
        const child = block.children.find((child) => child._key === childKey)

        if (child) {
          return [child, [{_key: block._key}, 'children', {_key: child._key}]]
        }
      }

      return [undefined, undefined]
    },
    findDOMNode: (
      element: PortableTextBlock | PortableTextChild,
    ): Node | undefined => {
      let node: Node | undefined
      try {
        const [item] = Array.from(
          Editor.nodes(editor, {
            at: [],
            match: (n) => n._key === element._key,
          }) || [],
        )[0] || [undefined]
        node = ReactEditor.toDOMNode(editor, item)
      } catch {
        // Nothing
      }
      return node
    },
    activeAnnotations: (): PortableTextObject[] => {
      if (!editor.selection || editor.selection.focus.path.length < 2) {
        return []
      }
      try {
        const activeAnnotations: PortableTextObject[] = []
        const spans = Editor.nodes(editor, {
          at: editor.selection,
          match: (node) =>
            Text.isText(node) &&
            node.marks !== undefined &&
            Array.isArray(node.marks) &&
            node.marks.length > 0,
        })
        for (const [span, path] of spans) {
          const [block] = Editor.node(editor, path, {depth: 1})
          if (editor.isTextBlock(block)) {
            block.markDefs?.forEach((def) => {
              if (
                Text.isText(span) &&
                span.marks &&
                Array.isArray(span.marks) &&
                span.marks.includes(def._key)
              ) {
                activeAnnotations.push(def)
              }
            })
          }
        }
        return activeAnnotations
      } catch {
        return []
      }
    },
    isAnnotationActive: (
      annotationType: PortableTextObject['_type'],
    ): boolean => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })

      return isActiveAnnotation(annotationType)(snapshot)
    },
    addAnnotation: (type, value) => {
      const snapshotBefore = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })
      const selectedValueBefore = getSelectedValue(snapshotBefore)
      const focusSpanBefore = getFocusSpan(snapshotBefore)
      const markDefsBefore = selectedValueBefore.flatMap((block) => {
        if (isTextBlock(snapshotBefore.context, block)) {
          return block.markDefs ?? []
        }

        return []
      })

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'annotation.add',
          annotation: {name: type.name, value: value ?? {}},
        },
        editor,
      })

      const snapshotAfter = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })

      const selectedValueAfter = getSelectedValue(snapshotAfter)
      const focusBlockAfter = getFocusBlock(snapshotAfter)
      const focusSpanAfter = getFocusSpan(snapshotAfter)

      const newMarkDefKeysOnFocusSpan = focusSpanAfter?.node.marks?.filter(
        (mark) =>
          !focusSpanBefore?.node.marks?.includes(mark) &&
          !snapshotAfter.context.schema.decorators
            .map((decorator) => decorator.name)
            .includes(mark),
      )
      const markDefsAfter = selectedValueAfter.flatMap((block) => {
        if (isTextBlock(snapshotAfter.context, block)) {
          return (
            block.markDefs?.map((markDef) => ({
              markDef,
              path: [{_key: block._key}, 'markDefs', {_key: markDef._key}],
            })) ?? []
          )
        }

        return []
      })
      const markDefs = markDefsAfter.filter(
        (markDef) =>
          !markDefsBefore.some(
            (markDefBefore) => markDefBefore._key === markDef.markDef._key,
          ),
      )
      const spanPath = focusSpanAfter?.path
      const markDef = markDefs.find((markDef) =>
        newMarkDefKeysOnFocusSpan?.some(
          (mark) => mark === markDef.markDef._key,
        ),
      )

      if (focusBlockAfter && spanPath && markDef) {
        return {
          markDefPath: markDef.path,
          markDefPaths: markDefs.map((markDef) => markDef.path),
          spanPath,
        }
      }
    },
    delete: (
      selection: EditorSelection,
      options?: EditableAPIDeleteOptions,
    ): void => {
      if (!selection) {
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete',
          at: selection,
          unit:
            options?.mode === 'blocks'
              ? 'block'
              : options?.mode === 'children'
                ? 'child'
                : undefined,
        },
        editor,
      })
    },
    removeAnnotation: <TSchemaType extends {name: string}>(
      type: TSchemaType,
    ): void => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'annotation.remove',
          annotation: {name: type.name},
        },
        editor,
      })
    },
    getSelection: (): EditorSelection | null => {
      let ptRange: EditorSelection = null
      if (editor.selection) {
        const existing = SLATE_TO_PORTABLE_TEXT_RANGE.get(editor.selection)
        if (existing) {
          return existing
        }
        ptRange = slateRangeToSelection({
          schema: editorActor.getSnapshot().context.schema,
          editor,
          range: editor.selection,
        })
        SLATE_TO_PORTABLE_TEXT_RANGE.set(editor.selection, ptRange)
      }
      return ptRange
    },
    getValue: () => {
      return editor.value
    },
    isCollapsedSelection: () => {
      return !!editor.selection && Range.isCollapsed(editor.selection)
    },
    isExpandedSelection: () => {
      return !!editor.selection && Range.isExpanded(editor.selection)
    },
    insertBreak: () => {
      editor.insertBreak()
      editor.onChange()
    },
    getFragment: () => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot: editorActor.getSnapshot(),
        slateEditorInstance: editor,
      })

      return getSelectedValue(snapshot)
    },
    isSelectionsOverlapping: (
      selectionA: EditorSelection,
      selectionB: EditorSelection,
    ) => {
      // Convert the selections to Slate ranges
      const rangeA = toSlateRange({
        context: {
          schema: editorActor.getSnapshot().context.schema,
          value: editor.value,
          selection: selectionA,
        },
        blockIndexMap: editor.blockIndexMap,
      })
      const rangeB = toSlateRange({
        context: {
          schema: editorActor.getSnapshot().context.schema,
          value: editor.value,
          selection: selectionB,
        },
        blockIndexMap: editor.blockIndexMap,
      })

      // Make sure the ranges are valid
      const isValidRanges = Range.isRange(rangeA) && Range.isRange(rangeB)

      // Check if the ranges are overlapping
      const isOverlapping = isValidRanges && Range.includes(rangeA, rangeB)

      return isOverlapping
    },
  }

  return editableApi
}

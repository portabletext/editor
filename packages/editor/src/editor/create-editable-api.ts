import {
  isSpan,
  isTextBlock,
  type PortableTextBlock,
  type PortableTextChild,
  type PortableTextObject,
} from '@portabletext/schema'
import {getDomNode} from '../dom-traversal/get-dom-node'
import type {Path as InternalPath} from '../engine/interfaces/path'
import {parentPath} from '../engine/path/parent-path'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isExpandedRange} from '../engine/range/is-expanded-range'
import {rangeEnd} from '../engine/range/range-end'
import {rangeIncludes} from '../engine/range/range-includes'
import {rangeStart} from '../engine/range/range-start'
import {isListItemActive, isStyleActive} from '../internal-utils/engine-utils'
import {getActiveAnnotationsMarks} from '../selectors/selector.get-active-annotation-marks'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getFragment} from '../selectors/selector.get-fragment'
import {getSelectedValue} from '../selectors/selector.get-selected-value'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {getLeaf} from '../traversal/get-leaf'
import {getNode} from '../traversal/get-node'
import {getNodes} from '../traversal/get-nodes'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {getTextBlock} from '../traversal/get-text-block'
import {getBlock, isBlock} from '../traversal/is-block'
import type {
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorSelection,
} from '../types/editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {Path} from '../types/paths'
import type {EditorActor} from './editor-machine'

export function createEditableAPI(
  editor: PortableTextEditorEngine,
  editorActor: EditorActor,
) {
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
      const snapshot = editor.snapshot

      const activeDecorators = getActiveDecorators(snapshot)

      return activeDecorators.includes(mark)
    },
    marks: (): string[] => {
      const snapshot = editor.snapshot

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
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'select',
          at: selection,
        },
        editor,
      })
    },
    focusBlock: (): PortableTextBlock | undefined => {
      if (!editor.snapshot.context.selection) {
        return undefined
      }

      const focusPath = editor.snapshot.context.selection.focus.path

      return (
        getBlock(editor.snapshot, focusPath)?.node ??
        getBlock(editor.snapshot, parentPath(focusPath))?.node
      )
    },
    focusChild: (): PortableTextChild | undefined => {
      if (!editor.snapshot.context.selection) {
        return undefined
      }

      const leaf = getLeaf(
        editor.snapshot,
        editor.snapshot.context.selection.focus.path,
        {edge: 'start'},
      )

      if (!leaf || isBlock(editor.snapshot, leaf.path)) {
        return undefined
      }

      return leaf.node as PortableTextChild
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

      return editor.snapshot.context.selection?.focus.path ?? []
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

      return editor.snapshot.context.selection?.focus.path ?? []
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
    isVoid: (element: PortableTextBlock | PortableTextChild): boolean => {
      const schema = editor.snapshot.context.schema
      return ![schema.block.name, schema.span.name].includes(element._type)
    },
    findByPath: (
      path: Path,
    ): [
      PortableTextBlock | PortableTextChild | undefined,
      Path | undefined,
    ] => {
      const result = getNode(editor.snapshot, path as InternalPath)

      if (!result) {
        return [undefined, undefined]
      }

      return [result.node, path]
    },
    findDOMNode: (
      element: PortableTextBlock | PortableTextChild,
    ): Node | undefined => {
      let node: Node | undefined
      try {
        const entry = Array.from(
          getNodes(editor.snapshot, {
            match: (n) => n._key === element._key,
          }),
        )[0]
        if (entry) {
          const itemPath = entry.path
          node = getDomNode(editor, itemPath)
        }
      } catch {
        // Nothing
      }
      return node
    },
    activeAnnotations: (): PortableTextObject[] => {
      if (
        !editor.snapshot.context.selection ||
        editor.snapshot.context.selection.focus.path.length < 2
      ) {
        return []
      }
      try {
        const activeAnnotations: PortableTextObject[] = []
        const spans = getNodes(editor.snapshot, {
          from: rangeStart(
            editor.snapshot.context.selection,
            editor.snapshot.context,
          ).path,
          to: rangeEnd(
            editor.snapshot.context.selection,
            editor.snapshot.context,
          ).path,
          match: (node) =>
            isSpan({schema: editor.snapshot.context.schema}, node) &&
            node.marks !== undefined &&
            Array.isArray(node.marks) &&
            node.marks.length > 0,
        })
        for (const {node: span, path: spanPath} of spans) {
          const blockEntry = getTextBlock(editor.snapshot, parentPath(spanPath))
          if (!blockEntry) {
            continue
          }
          const block = blockEntry.node
          block.markDefs?.forEach((def) => {
            if (
              isSpan({schema: editor.snapshot.context.schema}, span) &&
              span.marks &&
              Array.isArray(span.marks) &&
              span.marks.includes(def._key)
            ) {
              activeAnnotations.push(def)
            }
          })
        }
        return activeAnnotations
      } catch {
        return []
      }
    },
    isAnnotationActive: (
      annotationType: PortableTextObject['_type'],
    ): boolean => {
      const snapshot = editor.snapshot

      return isActiveAnnotation(annotationType)(snapshot)
    },
    addAnnotation: (type, value) => {
      const snapshotBefore = editor.snapshot
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

      const snapshotAfter = editor.snapshot

      const selectedValueAfter = getSelectedValue(snapshotAfter)
      const focusBlockAfter = getFocusBlock(snapshotAfter)
      const focusSpanAfter = getFocusSpan(snapshotAfter)

      const focusSpanDecorators = focusSpanAfter
        ? getPathSubSchema(snapshotAfter, focusSpanAfter.path).decorators.map(
            (decorator) => decorator.name,
          )
        : snapshotAfter.context.schema.decorators.map(
            (decorator) => decorator.name,
          )
      const newMarkDefKeysOnFocusSpan = focusSpanAfter?.node.marks?.filter(
        (mark) =>
          !focusSpanBefore?.node.marks?.includes(mark) &&
          !focusSpanDecorators.includes(mark),
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

      return undefined
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
      return editor.snapshot.context.selection
    },
    getValue: () => {
      return editor.snapshot.context.value
    },
    isCollapsedSelection: () => {
      return (
        !!editor.snapshot.context.selection &&
        isCollapsedRange(editor.snapshot.context.selection)
      )
    },
    isExpandedSelection: () => {
      return (
        !!editor.snapshot.context.selection &&
        isExpandedRange(editor.snapshot.context.selection)
      )
    },
    insertBreak: () => {
      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.break',
        },
        editor,
      })
    },
    getFragment: () => {
      const snapshot = editor.snapshot

      return getFragment(snapshot).map((entry) => entry.node)
    },
    isSelectionsOverlapping: (
      selectionA: EditorSelection,
      selectionB: EditorSelection,
    ) => {
      if (!selectionA || !selectionB) {
        return false
      }

      return rangeIncludes(selectionA, selectionB, editor.snapshot.context)
    },
  }

  return editableApi
}

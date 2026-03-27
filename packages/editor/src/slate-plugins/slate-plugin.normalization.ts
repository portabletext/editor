import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {applyInsertNodeAtPath} from '../internal-utils/apply-insert-node'
import {applyMergeNode} from '../internal-utils/apply-merge-node'
import {applySetNode} from '../internal-utils/apply-set-node'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import {isEqualMarkDefs} from '../internal-utils/equality'
import {getChildren} from '../node-traversal/get-children'
import {getSpanNode} from '../node-traversal/get-span-node'
import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {isEditor} from '../slate/editor/is-editor'
import {isSpanNode} from '../slate/node/is-span-node'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {parentPath} from '../slate/path/parent-path'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {withNormalizeNode} from './slate-plugin.normalize-node'
import {withoutPatching} from './slate-plugin.without-patching'

export function createNormalizationPlugin(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function normalizationPlugin(editor: PortableTextSlateEditor) {
    const {apply, normalizeNode} = editor
    const defaultStyle = editorActor
      .getSnapshot()
      .context.schema.styles.at(0)?.name

    editor.normalizeNode = (nodeEntry) => {
      const [node, path] = nodeEntry

      /**
       * Add a placeholder block when the editor is empty
       */
      if (isEditor(node) && node.children.length === 0) {
        withoutPatching(editor, () => {
          withNormalizeNode(editor, () => {
            applyInsertNodeAtPath(
              editor,
              createPlaceholderBlock(editorActor.getSnapshot().context),
              [0],
            )
          })
        })
      }

      /**
       * Merge spans with same set of .marks
       */
      if (isTextBlock({schema: editor.schema}, node)) {
        const children = getChildren(editor, path)

        for (const {node: child, path: childPath} of children) {
          const childIndex = childPath[childPath.length - 1]!
          const nextNode = node.children[childIndex + 1]

          if (
            isSpan({schema: editor.schema}, child) &&
            isSpan({schema: editor.schema}, nextNode) &&
            child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
            nextNode.marks?.every((mark) => child.marks?.includes(mark))
          ) {
            debug.normalization('merging spans with same marks')
            withNormalizeNode(editor, () => {
              const mergePath = [childPath[0]!, childPath[1]! + 1]
              applyMergeNode(editor, mergePath, child.text.length)
            })
            return
          }
        }
      }

      /**
       * Add missing .markDefs to block nodes
       */
      if (
        isTextBlockNode({schema: editor.schema}, node) &&
        !Array.isArray(node.markDefs)
      ) {
        debug.normalization('adding .markDefs to block node')
        withNormalizeNode(editor, () => {
          applySetNode(editor, {markDefs: []}, path)
        })
        return
      }

      /**
       * Add missing .style to block nodes
       */
      if (
        defaultStyle &&
        isTextBlockNode({schema: editor.schema}, node) &&
        typeof node.style === 'undefined'
      ) {
        debug.normalization('adding .style to block node')

        withNormalizeNode(editor, () => {
          applySetNode(editor, {style: defaultStyle}, path)
        })
        return
      }

      /**
       * Add missing .text to span nodes
       */
      if (
        isSpanNode({schema: editor.schema}, node) &&
        typeof node.text !== 'string'
      ) {
        debug.normalization('Adding .text to span node')
        withNormalizeNode(editor, () => {
          editor.apply({
            type: 'set_node',
            path,
            properties: {},
            newProperties: {text: ''},
          })
        })
        return
      }

      /**
       * Add missing .marks to span nodes
       */
      if (isSpan({schema: editor.schema}, node) && !Array.isArray(node.marks)) {
        debug.normalization('Adding .marks to span node')
        withNormalizeNode(editor, () => {
          applySetNode(editor, {marks: []}, path)
        })
        return
      }

      /**
       * Remove annotations from empty spans
       */
      if (isSpan({schema: editor.schema}, node)) {
        const blockPath = parentPath(path)
        const blockEntry = getTextBlockNode(editor, blockPath)
        if (!blockEntry) {
          return
        }
        const decorators = editorActor
          .getSnapshot()
          .context.schema.decorators.map((decorator) => decorator.name)
        const annotations = node.marks?.filter(
          (mark) => !decorators.includes(mark),
        )

        if (node.text === '' && annotations && annotations.length > 0) {
          debug.normalization('removing annotations from empty span node')
          withNormalizeNode(editor, () => {
            applySetNode(
              editor,
              {
                marks: node.marks?.filter((mark) => decorators.includes(mark)),
              },
              path,
            )
          })
          return
        }
      }

      /**
       * Remove orphaned annotations from child spans of block nodes
       */
      if (isTextBlock({schema: editor.schema}, node)) {
        const decorators = editorActor
          .getSnapshot()
          .context.schema.decorators.map((decorator) => decorator.name)

        for (const {node: child, path: childPath} of getChildren(
          editor,
          path,
        )) {
          if (isSpan({schema: editor.schema}, child)) {
            const marks = child.marks ?? []
            const orphanedAnnotations = marks.filter((mark) => {
              return (
                !decorators.includes(mark) &&
                !node.markDefs?.find((def) => def._key === mark)
              )
            })

            if (orphanedAnnotations.length > 0) {
              debug.normalization(
                'removing orphaned annotations from span node',
              )
              withNormalizeNode(editor, () => {
                applySetNode(
                  editor,
                  {
                    marks: marks.filter(
                      (mark) => !orphanedAnnotations.includes(mark),
                    ),
                  },
                  childPath,
                )
              })
              return
            }
          }
        }
      }

      /**
       * Remove orphaned annotations from span nodes
       */
      if (isSpan({schema: editor.schema}, node)) {
        const blockPath = parentPath(path)
        const blockEntry2 = getTextBlockNode(editor, blockPath)

        if (blockEntry2) {
          const block = blockEntry2.node
          const decorators = editorActor
            .getSnapshot()
            .context.schema.decorators.map((decorator) => decorator.name)
          const marks = node.marks ?? []
          const orphanedAnnotations = marks.filter((mark) => {
            return (
              !decorators.includes(mark) &&
              !block.markDefs?.find((def) => def._key === mark)
            )
          })

          if (orphanedAnnotations.length > 0) {
            debug.normalization('removing orphaned annotations from span node')
            withNormalizeNode(editor, () => {
              applySetNode(
                editor,
                {
                  marks: marks.filter(
                    (mark) => !orphanedAnnotations.includes(mark),
                  ),
                },
                path,
              )
            })
            return
          }
        }
      }

      // Remove duplicate markDefs
      if (isTextBlock({schema: editor.schema}, node)) {
        const markDefs = node.markDefs ?? []
        const markDefKeys = new Set<string>()
        const newMarkDefs: Array<PortableTextObject> = []

        for (const markDef of markDefs) {
          if (!markDefKeys.has(markDef._key)) {
            markDefKeys.add(markDef._key)
            newMarkDefs.push(markDef)
          }
        }

        if (markDefs.length !== newMarkDefs.length) {
          debug.normalization('removing duplicate markDefs')
          withNormalizeNode(editor, () => {
            applySetNode(editor, {markDefs: newMarkDefs}, path)
          })
          return
        }
      }

      // Check consistency of markDefs (unless we are merging two nodes)
      if (isTextBlock({schema: editor.schema}, node)) {
        const newMarkDefs = (node.markDefs || []).filter((def) => {
          return node.children.find((child) => {
            return (
              isSpan({schema: editor.schema}, child) &&
              Array.isArray(child.marks) &&
              child.marks.includes(def._key)
            )
          })
        })

        if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
          debug.normalization('removing markDef not in use')
          withNormalizeNode(editor, () => {
            applySetNode(
              editor,
              {
                markDefs: newMarkDefs,
              },
              path,
            )
          })
          return
        }
      }

      withNormalizeNode(editor, () => {
        normalizeNode(nodeEntry)
      })
    }

    editor.apply = (op) => {
      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (editor.isProcessingRemoteChanges) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (editor.isUndoing || editor.isRedoing) {
        apply(op)
        return
      }

      if (op.type === 'set_selection') {
        if (
          op.properties &&
          op.newProperties &&
          op.properties.anchor &&
          op.properties.focus &&
          op.newProperties.anchor &&
          op.newProperties.focus
        ) {
          const previousSelectionIsCollapsed = isCollapsedRange({
            anchor: op.properties.anchor,
            focus: op.properties.focus,
          })
          const newSelectionIsCollapsed = isCollapsedRange({
            anchor: op.newProperties.anchor,
            focus: op.newProperties.focus,
          })

          if (previousSelectionIsCollapsed && newSelectionIsCollapsed) {
            const focusSpanEntry = getSpanNode(editor, op.properties.focus.path)
            const focusSpan: PortableTextSpan | undefined = focusSpanEntry?.node
            const newFocusSpanEntry = getSpanNode(
              editor,
              op.newProperties.focus.path,
            )
            const newFocusSpan: PortableTextSpan | undefined =
              newFocusSpanEntry?.node
            const movedToNextSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1]! + 1 &&
              focusSpan.text.length === op.properties.focus.offset &&
              op.newProperties.focus.offset === 0
            const movedToPreviousSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1]! - 1 &&
              op.properties.focus.offset === 0 &&
              newFocusSpan.text.length === op.newProperties.focus.offset

            // In the case of a collapsed selection moving to another collapsed
            // selection, we only want to clear the decorator state if the
            // caret is visually moving to a different span.
            if (!movedToNextSpan && !movedToPreviousSpan) {
              editor.decoratorState = {}
            }
          }
        } else {
          // In any other case, we want to clear the decorator state.
          editor.decoratorState = {}
        }
      }

      apply(op)
    }

    return editor
  }
}

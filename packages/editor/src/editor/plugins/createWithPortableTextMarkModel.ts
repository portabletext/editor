/**
 *
 * This plugin will change Slate's default marks model (every prop is a mark) with the Portable Text model (marks is an array of strings on prop .marks).
 *
 */

import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import {isEqual, uniq} from 'lodash'
import {Editor, Element, Node, Path, Range, Text, Transforms} from 'slate'
import {debugWithName} from '../../internal-utils/debug'
import {getNextSpan, getPreviousSpan} from '../../internal-utils/sibling-utils'
import {isChangingRemotely} from '../../internal-utils/withChanges'
import {isRedoing, isUndoing} from '../../internal-utils/withUndoRedo'
import type {BehaviorOperationImplementation} from '../../operations/behavior.operations'
import {getActiveDecorators} from '../../selectors/selector.get-active-decorators'
import {getMarkState} from '../../selectors/selector.get-mark-state'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {EditorActor} from '../editor-machine'
import {getEditorSnapshot} from '../editor-selector'

const debug = debugWithName('plugin:withPortableTextMarkModel')

export function createWithPortableTextMarkModel(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withPortableTextMarkModel(editor: PortableTextSlateEditor) {
    const {apply, normalizeNode} = editor
    const decorators = editorActor
      .getSnapshot()
      .context.schema.decorators.map((t) => t.name)

    // Extend Slate's default normalization. Merge spans with same set of .marks when doing merge_node operations, and clean up markDefs / marks
    editor.normalizeNode = (nodeEntry) => {
      const [node, path] = nodeEntry

      if (editor.isTextBlock(node)) {
        const children = Node.children(editor, path)

        for (const [child, childPath] of children) {
          const nextNode = node.children[childPath[1] + 1]

          if (
            editor.isTextSpan(child) &&
            editor.isTextSpan(nextNode) &&
            child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
            nextNode.marks?.every((mark) => child.marks?.includes(mark))
          ) {
            debug(
              'Merging spans',
              JSON.stringify(child, null, 2),
              JSON.stringify(nextNode, null, 2),
            )
            editorActor.send({type: 'normalizing'})
            Transforms.mergeNodes(editor, {
              at: [childPath[0], childPath[1] + 1],
              voids: true,
            })
            editorActor.send({type: 'done normalizing'})
            return
          }
        }
      }

      /**
       * Add missing .markDefs to block nodes
       */
      if (editor.isTextBlock(node) && !Array.isArray(node.markDefs)) {
        debug('Adding .markDefs to block node')
        editorActor.send({type: 'normalizing'})
        Transforms.setNodes(editor, {markDefs: []}, {at: path})
        editorActor.send({type: 'done normalizing'})
        return
      }

      /**
       * Add missing .marks to span nodes
       */
      if (editor.isTextSpan(node) && !Array.isArray(node.marks)) {
        debug('Adding .marks to span node')
        editorActor.send({type: 'normalizing'})
        Transforms.setNodes(editor, {marks: []}, {at: path})
        editorActor.send({type: 'done normalizing'})
        return
      }

      /**
       * Remove annotations from empty spans
       */
      if (editor.isTextSpan(node)) {
        const blockPath = Path.parent(path)
        const [block] = Editor.node(editor, blockPath)
        const decorators = editorActor
          .getSnapshot()
          .context.schema.decorators.map((decorator) => decorator.name)
        const annotations = node.marks?.filter(
          (mark) => !decorators.includes(mark),
        )

        if (editor.isTextBlock(block)) {
          if (node.text === '' && annotations && annotations.length > 0) {
            debug('Removing annotations from empty span node')
            editorActor.send({type: 'normalizing'})
            Transforms.setNodes(
              editor,
              {marks: node.marks?.filter((mark) => decorators.includes(mark))},
              {at: path},
            )
            editorActor.send({type: 'done normalizing'})
            return
          }
        }
      }

      /**
       * Remove orphaned annotations from child spans of block nodes
       */
      if (editor.isTextBlock(node)) {
        const decorators = editorActor
          .getSnapshot()
          .context.schema.decorators.map((decorator) => decorator.name)

        for (const [child, childPath] of Node.children(editor, path)) {
          if (editor.isTextSpan(child)) {
            const marks = child.marks ?? []
            const orphanedAnnotations = marks.filter((mark) => {
              return (
                !decorators.includes(mark) &&
                !node.markDefs?.find((def) => def._key === mark)
              )
            })

            if (orphanedAnnotations.length > 0) {
              debug('Removing orphaned annotations from span node')
              editorActor.send({type: 'normalizing'})
              Transforms.setNodes(
                editor,
                {
                  marks: marks.filter(
                    (mark) => !orphanedAnnotations.includes(mark),
                  ),
                },
                {at: childPath},
              )
              editorActor.send({type: 'done normalizing'})
              return
            }
          }
        }
      }

      /**
       * Remove orphaned annotations from span nodes
       */
      if (editor.isTextSpan(node)) {
        const blockPath = Path.parent(path)
        const [block] = Editor.node(editor, blockPath)

        if (editor.isTextBlock(block)) {
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
            debug('Removing orphaned annotations from span node')
            editorActor.send({type: 'normalizing'})
            Transforms.setNodes(
              editor,
              {
                marks: marks.filter(
                  (mark) => !orphanedAnnotations.includes(mark),
                ),
              },
              {at: path},
            )
            editorActor.send({type: 'done normalizing'})
            return
          }
        }
      }

      // Remove duplicate markDefs
      if (editor.isTextBlock(node)) {
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
          debug('Removing duplicate markDefs')
          editorActor.send({type: 'normalizing'})
          Transforms.setNodes(editor, {markDefs: newMarkDefs}, {at: path})
          editorActor.send({type: 'done normalizing'})
          return
        }
      }

      // Check consistency of markDefs (unless we are merging two nodes)
      if (
        editor.isTextBlock(node) &&
        !editor.operations.some(
          (op) =>
            op.type === 'merge_node' &&
            'markDefs' in op.properties &&
            op.path.length === 1,
        )
      ) {
        const newMarkDefs = (node.markDefs || []).filter((def) => {
          return node.children.find((child) => {
            return (
              Text.isText(child) &&
              Array.isArray(child.marks) &&
              child.marks.includes(def._key)
            )
          })
        })
        if (node.markDefs && !isEqual(newMarkDefs, node.markDefs)) {
          debug('Removing markDef not in use')
          editorActor.send({type: 'normalizing'})
          Transforms.setNodes(
            editor,
            {
              markDefs: newMarkDefs,
            },
            {at: path},
          )
          editorActor.send({type: 'done normalizing'})
          return
        }
      }

      normalizeNode(nodeEntry)
    }

    editor.apply = (op) => {
      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (isChangingRemotely(editor)) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (isUndoing(editor) || isRedoing(editor)) {
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
          const previousSelectionIsCollapsed = Range.isCollapsed({
            anchor: op.properties.anchor,
            focus: op.properties.focus,
          })
          const newSelectionIsCollapsed = Range.isCollapsed({
            anchor: op.newProperties.anchor,
            focus: op.newProperties.focus,
          })

          if (previousSelectionIsCollapsed && newSelectionIsCollapsed) {
            const focusSpan: PortableTextSpan | undefined = Array.from(
              Editor.nodes(editor, {
                mode: 'lowest',
                at: op.properties.focus,
                match: (n) => editor.isTextSpan(n),
                voids: false,
              }),
            )[0]?.[0]
            const newFocusSpan: PortableTextSpan | undefined = Array.from(
              Editor.nodes(editor, {
                mode: 'lowest',
                at: op.newProperties.focus,
                match: (n) => editor.isTextSpan(n),
                voids: false,
              }),
            )[0]?.[0]
            const movedToNextSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1] + 1 &&
              focusSpan.text.length === op.properties.focus.offset &&
              op.newProperties.focus.offset === 0
            const movedToPreviousSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1] - 1 &&
              op.properties.focus.offset === 0 &&
              newFocusSpan.text.length === op.newProperties.focus.offset

            // We only want to clear the decorator state if the caret is visually
            // moving
            if (!movedToNextSpan && !movedToPreviousSpan) {
              editor.decoratorState = {}
            }
          }
        }
      }

      if (op.type === 'insert_node') {
        const {selection} = editor

        if (selection) {
          const [_block, blockPath] = Editor.node(editor, selection, {depth: 1})
          const previousSpan = getPreviousSpan({
            editor,
            blockPath,
            spanPath: op.path,
          })
          const previousSpanAnnotations = previousSpan
            ? previousSpan.marks?.filter((mark) => !decorators.includes(mark))
            : []

          const nextSpan = getNextSpan({
            editor,
            blockPath,
            spanPath: [op.path[0], op.path[1] - 1],
          })
          const nextSpanAnnotations = nextSpan
            ? nextSpan.marks?.filter((mark) => !decorators.includes(mark))
            : []

          const annotationsEnding =
            previousSpanAnnotations?.filter(
              (annotation) => !nextSpanAnnotations?.includes(annotation),
            ) ?? []
          const atTheEndOfAnnotation = annotationsEnding.length > 0

          if (
            atTheEndOfAnnotation &&
            isPortableTextSpan(op.node) &&
            op.node.marks?.some((mark) => annotationsEnding.includes(mark))
          ) {
            Transforms.insertNodes(editor, {
              ...op.node,
              _key: editorActor.getSnapshot().context.keyGenerator(),
              marks:
                op.node.marks?.filter(
                  (mark) => !annotationsEnding.includes(mark),
                ) ?? [],
            })
            return
          }

          const annotationsStarting =
            nextSpanAnnotations?.filter(
              (annotation) => !previousSpanAnnotations?.includes(annotation),
            ) ?? []
          const atTheStartOfAnnotation = annotationsStarting.length > 0

          if (
            atTheStartOfAnnotation &&
            isPortableTextSpan(op.node) &&
            op.node.marks?.some((mark) => annotationsStarting.includes(mark))
          ) {
            Transforms.insertNodes(editor, {
              ...op.node,
              _key: editorActor.getSnapshot().context.keyGenerator(),
              marks:
                op.node.marks?.filter(
                  (mark) => !annotationsStarting.includes(mark),
                ) ?? [],
            })
            return
          }

          const nextSpanDecorators =
            nextSpan?.marks?.filter((mark) => decorators.includes(mark)) ?? []
          const decoratorStarting = nextSpanDecorators.length > 0

          if (
            decoratorStarting &&
            atTheEndOfAnnotation &&
            !atTheStartOfAnnotation &&
            isPortableTextSpan(op.node) &&
            op.node.marks?.length === 0
          ) {
            Transforms.insertNodes(editor, {
              ...op.node,
              _key: editorActor.getSnapshot().context.keyGenerator(),
              marks: nextSpanDecorators,
            })
            return
          }
        }
      }

      if (op.type === 'insert_text') {
        const snapshot = getEditorSnapshot({
          editorActorSnapshot: editorActor.getSnapshot(),
          slateEditorInstance: editor,
        })

        const markState = getMarkState(snapshot)

        if (!markState) {
          apply(op)
          return
        }

        if (markState.state === 'unchanged') {
          apply(op)
          return
        }

        Transforms.insertNodes(editor, {
          _type: 'span',
          _key: editorActor.getSnapshot().context.keyGenerator(),
          text: op.text,
          marks: markState.marks,
        })

        return
      }

      if (op.type === 'remove_text') {
        const {selection} = editor

        if (selection && Range.isExpanded(selection)) {
          const [block, blockPath] = Editor.node(editor, selection, {
            depth: 1,
          })
          const [span, spanPath] =
            Array.from(
              Editor.nodes(editor, {
                mode: 'lowest',
                at: {path: op.path, offset: op.offset},
                match: (n) => editor.isTextSpan(n),
                voids: false,
              }),
            )[0] ?? ([undefined, undefined] as const)

          if (span && block && isPortableTextBlock(block)) {
            const markDefs = block.markDefs ?? []
            const marks = span.marks ?? []
            const spanHasAnnotations = marks.some((mark) =>
              markDefs.find((markDef) => markDef._key === mark),
            )
            const deletingFromTheEnd =
              op.offset + op.text.length === span.text.length
            const deletingAllText = op.offset === 0 && deletingFromTheEnd

            const previousSpan = getPreviousSpan({editor, blockPath, spanPath})
            const nextSpan = getNextSpan({editor, blockPath, spanPath})

            const previousSpanHasSameAnnotation = previousSpan
              ? previousSpan.marks?.some(
                  (mark) => !decorators.includes(mark) && marks.includes(mark),
                )
              : false
            const nextSpanHasSameAnnotation = nextSpan
              ? nextSpan.marks?.some(
                  (mark) => !decorators.includes(mark) && marks.includes(mark),
                )
              : false

            if (
              spanHasAnnotations &&
              deletingAllText &&
              !previousSpanHasSameAnnotation &&
              !nextSpanHasSameAnnotation
            ) {
              const snapshot = getEditorSnapshot({
                editorActorSnapshot: editorActor.getSnapshot(),
                slateEditorInstance: editor,
              })

              Editor.withoutNormalizing(editor, () => {
                apply(op)
                Transforms.setNodes(
                  editor,
                  {marks: getActiveDecorators(snapshot)},
                  {at: op.path},
                )
              })

              editor.onChange()
              return
            }
          }
        }
      }

      /**
       * Copy over markDefs when merging blocks
       */
      if (
        op.type === 'merge_node' &&
        op.path.length === 1 &&
        'markDefs' in op.properties &&
        op.properties._type ===
          editorActor.getSnapshot().context.schema.block.name &&
        Array.isArray(op.properties.markDefs) &&
        op.properties.markDefs.length > 0 &&
        op.path[0] - 1 >= 0
      ) {
        const [targetBlock, targetPath] = Editor.node(editor, [op.path[0] - 1])

        if (editor.isTextBlock(targetBlock)) {
          const oldDefs =
            (Array.isArray(targetBlock.markDefs) && targetBlock.markDefs) || []
          const newMarkDefs = uniq([...oldDefs, ...op.properties.markDefs])

          debug(`Copying markDefs over to merged block`, op)
          Transforms.setNodes(
            editor,
            {markDefs: newMarkDefs},
            {at: targetPath, voids: false},
          )
          apply(op)
          return
        }
      }

      apply(op)
    }

    return editor
  }
}

export const removeDecoratorOperationImplementation: BehaviorOperationImplementation<
  'decorator.remove'
> = ({operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const {selection} = editor

  if (selection) {
    if (Range.isExpanded(selection)) {
      // Split if needed
      Transforms.setNodes(
        editor,
        {},
        {match: Text.isText, split: true, hanging: true},
      )
      if (editor.selection) {
        const splitTextNodes = [
          ...Editor.nodes(editor, {
            at: editor.selection,
            match: Text.isText,
          }),
        ]
        splitTextNodes.forEach(([node, path]) => {
          const block = editor.children[path[0]]
          if (Element.isElement(block) && block.children.includes(node)) {
            Transforms.setNodes(
              editor,
              {
                marks: (Array.isArray(node.marks) ? node.marks : []).filter(
                  (eMark: string) => eMark !== mark,
                ),
                _type: 'span',
              },
              {at: path},
            )
          }
        })
      }
    } else {
      const [block, blockPath] = Editor.node(editor, selection, {
        depth: 1,
      })
      const lonelyEmptySpan =
        editor.isTextBlock(block) &&
        block.children.length === 1 &&
        editor.isTextSpan(block.children[0]) &&
        block.children[0].text === ''
          ? block.children[0]
          : undefined

      if (lonelyEmptySpan) {
        const existingMarks = lonelyEmptySpan.marks ?? []
        const existingMarksWithoutDecorator = existingMarks.filter(
          (existingMark) => existingMark !== mark,
        )

        Transforms.setNodes(
          editor,
          {
            marks: existingMarksWithoutDecorator,
          },
          {
            at: blockPath,
            match: (node) => editor.isTextSpan(node),
          },
        )
      } else {
        editor.decoratorState[mark] = false
      }
    }

    if (editor.selection) {
      // Reselect
      const selection = editor.selection
      editor.selection = {...selection}
    }
  }
}

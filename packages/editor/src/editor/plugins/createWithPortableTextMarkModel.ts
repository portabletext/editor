/**
 *
 * This plugin will change Slate's default marks model (every prop is a mark) with the Portable Text model (marks is an array of strings on prop .marks).
 *
 */

import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import {Editor, Element, Node, Path, Range, Text, Transforms} from 'slate'
import {createPlaceholderBlock} from '../../internal-utils/create-placeholder-block'
import {debugWithName} from '../../internal-utils/debug'
import {isEqualMarkDefs} from '../../internal-utils/equality'
import type {BehaviorOperationImplementation} from '../../operations/behavior.operations'
import type {PortableTextSlateEditor} from '../../types/slate-editor'
import type {EditorActor} from '../editor-machine'
import {withNormalizeNode} from '../with-normalizing-node'
import {withoutPatching} from '../withoutPatching'

const debug = debugWithName('plugin:withPortableTextMarkModel')

export function createWithPortableTextMarkModel(
  editorActor: EditorActor,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withPortableTextMarkModel(editor: PortableTextSlateEditor) {
    const {apply, normalizeNode} = editor
    const defaultStyle = editorActor
      .getSnapshot()
      .context.schema.styles.at(0)?.name

    // Extend Slate's default normalization. Merge spans with same set of .marks when doing merge_node operations, and clean up markDefs / marks
    editor.normalizeNode = (nodeEntry) => {
      const [node, path] = nodeEntry

      if (Editor.isEditor(node) && node.children.length === 0) {
        withoutPatching(editor, () => {
          withNormalizeNode(editor, () => {
            Transforms.insertNodes(
              editor,
              createPlaceholderBlock(editorActor.getSnapshot().context),
              {at: [0], select: true},
            )
          })
        })
      }

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
            withNormalizeNode(editor, () => {
              Transforms.mergeNodes(editor, {
                at: [childPath[0], childPath[1] + 1],
                voids: true,
              })
            })
            return
          }
        }
      }

      /**
       * Add missing .markDefs to block nodes
       */
      if (editor.isTextBlock(node) && !Array.isArray(node.markDefs)) {
        debug('Adding .markDefs to block node')
        withNormalizeNode(editor, () => {
          Transforms.setNodes(editor, {markDefs: []}, {at: path})
        })
        return
      }

      /**
       * Add missing .style to block nodes
       */
      if (
        defaultStyle &&
        editor.isTextBlock(node) &&
        typeof node.style === 'undefined'
      ) {
        debug('Adding .style to block node')

        withNormalizeNode(editor, () => {
          Transforms.setNodes(editor, {style: defaultStyle}, {at: path})
        })
        return
      }

      /**
       * Add missing .marks to span nodes
       */
      if (editor.isTextSpan(node) && !Array.isArray(node.marks)) {
        debug('Adding .marks to span node')
        withNormalizeNode(editor, () => {
          Transforms.setNodes(editor, {marks: []}, {at: path})
        })
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
            withNormalizeNode(editor, () => {
              Transforms.setNodes(
                editor,
                {
                  marks: node.marks?.filter((mark) =>
                    decorators.includes(mark),
                  ),
                },
                {at: path},
              )
            })
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
              withNormalizeNode(editor, () => {
                Transforms.setNodes(
                  editor,
                  {
                    marks: marks.filter(
                      (mark) => !orphanedAnnotations.includes(mark),
                    ),
                  },
                  {at: childPath},
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
            withNormalizeNode(editor, () => {
              Transforms.setNodes(
                editor,
                {
                  marks: marks.filter(
                    (mark) => !orphanedAnnotations.includes(mark),
                  ),
                },
                {at: path},
              )
            })
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
          withNormalizeNode(editor, () => {
            Transforms.setNodes(editor, {markDefs: newMarkDefs}, {at: path})
          })
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
        if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
          debug('Removing markDef not in use')
          withNormalizeNode(editor, () => {
            Transforms.setNodes(
              editor,
              {
                markDefs: newMarkDefs,
              },
              {at: path},
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
          const newMarkDefs = [
            ...new Map(
              [...oldDefs, ...op.properties.markDefs].map((def) => [
                def._key,
                def,
              ]),
            ).values(),
          ]

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

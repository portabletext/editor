/* eslint-disable max-statements */
/* eslint-disable complexity */
/**
 *
 * This plugin will change Slate's default marks model (every prop is a mark) with the Portable Text model (marks is an array of strings on prop .marks).
 *
 */

import {isPortableTextBlock, isPortableTextSpan} from '@portabletext/toolkit'
import {isEqual, uniq} from 'lodash'
import {type Subject} from 'rxjs'
import {type Descendant, Editor, Element, Node, Path, Range, Text, Transforms} from 'slate'

import {
  type EditorChange,
  type PortableTextMemberSchemaTypes,
  type PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {toPortableTextRange} from '../../utils/ranges'
import {isChangingRemotely} from '../../utils/withChanges'
import {isRedoing, isUndoing} from '../../utils/withUndoRedo'

const debug = debugWithName('plugin:withPortableTextMarkModel')

export function createWithPortableTextMarkModel(
  types: PortableTextMemberSchemaTypes,
  change$: Subject<EditorChange>,
  keyGenerator: () => string,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withPortableTextMarkModel(editor: PortableTextSlateEditor) {
    const {apply, normalizeNode} = editor
    const decorators = types.decorators.map((t) => t.value)

    // Selections are normally emitted automatically via
    // onChange, but they will keep the object reference if
    // the selection is the same as the previous.
    // When toggling marks however, it might not even
    // result in a onChange event (for instance when nothing is selected),
    // and if you toggle marks on a block with one single span,
    // the selection would also stay the same.
    // We should force a new selection object here when toggling marks,
    // because toolbars and other things can very conveniently
    // be memo'ed on the editor selection to update itself.
    const forceNewSelection = () => {
      if (editor.selection) {
        Transforms.select(editor, {...editor.selection})
        editor.selection = {...editor.selection} // Ensure new object
      }
      const ptRange = toPortableTextRange(editor.children, editor.selection, types)
      change$.next({type: 'selection', selection: ptRange})
    }

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
            isEqual(child.marks, nextNode.marks)
          ) {
            debug(
              'Merging spans',
              JSON.stringify(child, null, 2),
              JSON.stringify(nextNode, null, 2),
            )
            Transforms.mergeNodes(editor, {at: [childPath[0], childPath[1] + 1], voids: true})
            return
          }
        }
      }

      /**
       * Add missing .marks to span nodes
       */
      if (editor.isTextSpan(node) && !Array.isArray(node.marks)) {
        debug('Adding .marks to span node')
        Transforms.setNodes(editor, {marks: []}, {at: path})
        return
      }

      /**
       * Remove annotations from empty spans
       */
      if (editor.isTextSpan(node)) {
        const blockPath = Path.parent(path)
        const [block] = Editor.node(editor, blockPath)
        const decorators = types.decorators.map((decorator) => decorator.value)
        const annotations = node.marks?.filter((mark) => !decorators.includes(mark))

        if (editor.isTextBlock(block)) {
          if (node.text === '' && annotations && annotations.length > 0) {
            debug('Removing annotations from empty span node')
            Transforms.setNodes(
              editor,
              {marks: node.marks?.filter((mark) => decorators.includes(mark))},
              {at: path},
            )
            return
          }
        }
      }

      /**
       * Remove orphaned annotations from child spans of block nodes
       */
      if (editor.isTextBlock(node)) {
        const decorators = types.decorators.map((decorator) => decorator.value)

        for (const [child, childPath] of Node.children(editor, path)) {
          if (editor.isTextSpan(child)) {
            const marks = child.marks ?? []
            const orphanedAnnotations = marks.filter((mark) => {
              return !decorators.includes(mark) && !node.markDefs?.find((def) => def._key === mark)
            })

            if (orphanedAnnotations.length > 0) {
              debug('Removing orphaned annotations from span node')
              Transforms.setNodes(
                editor,
                {marks: marks.filter((mark) => !orphanedAnnotations.includes(mark))},
                {at: childPath},
              )
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
          const decorators = types.decorators.map((decorator) => decorator.value)
          const marks = node.marks ?? []
          const orphanedAnnotations = marks.filter((mark) => {
            return !decorators.includes(mark) && !block.markDefs?.find((def) => def._key === mark)
          })

          if (orphanedAnnotations.length > 0) {
            debug('Removing orphaned annotations from span node')
            Transforms.setNodes(
              editor,
              {marks: marks.filter((mark) => !orphanedAnnotations.includes(mark))},
              {at: path},
            )
            return
          }
        }
      }

      // Check consistency of markDefs (unless we are merging two nodes)
      if (
        editor.isTextBlock(node) &&
        !editor.operations.some(
          (op) => op.type === 'merge_node' && 'markDefs' in op.properties && op.path.length === 1,
        )
      ) {
        const newMarkDefs = (node.markDefs || []).filter((def) => {
          return node.children.find((child) => {
            return (
              Text.isText(child) && Array.isArray(child.marks) && child.marks.includes(def._key)
            )
          })
        })
        if (node.markDefs && !isEqual(newMarkDefs, node.markDefs)) {
          debug('Removing markDef not in use')
          Transforms.setNodes(
            editor,
            {
              markDefs: newMarkDefs,
            },
            {at: path},
          )
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

      // Special hook before inserting text at the end of an annotation.
      if (op.type === 'insert_text') {
        const {selection} = editor
        if (
          selection &&
          Range.isCollapsed(selection) &&
          Editor.marks(editor)?.marks?.some((mark) => !decorators.includes(mark))
        ) {
          const [node] = Array.from(
            Editor.nodes(editor, {
              mode: 'lowest',
              at: selection.focus,
              match: (n) => (n as unknown as Descendant)._type === types.span.name,
              voids: false,
            }),
          )[0] || [undefined]
          if (
            Text.isText(node) &&
            node.text.length === selection.focus.offset &&
            Array.isArray(node.marks) &&
            node.marks.length > 0
          ) {
            const marksWithoutAnnotationMarks: string[] = (
              {
                ...(Editor.marks(editor) || {}),
              }.marks || []
            ).filter((mark) => decorators.includes(mark))
            Transforms.insertNodes(editor, {
              _type: 'span',
              _key: keyGenerator(),
              text: op.text,
              marks: marksWithoutAnnotationMarks,
            })
            debug('Inserting text at end of annotation')
            return
          }
        }
      }

      if (op.type === 'remove_text') {
        const nodeEntry = Array.from(
          Editor.nodes(editor, {
            mode: 'lowest',
            at: {path: op.path, offset: op.offset},
            match: (n) => n._type === types.span.name,
            voids: false,
          }),
        )[0]
        const node = nodeEntry[0]
        const blockEntry = Editor.node(editor, Path.parent(op.path))
        const block = blockEntry[0]

        if (node && isPortableTextSpan(node) && block && isPortableTextBlock(block)) {
          const markDefs = block.markDefs ?? []
          const nodeHasAnnotations = (node.marks ?? []).some((mark) =>
            markDefs.find((markDef) => markDef._key === mark),
          )
          const deletingPartOfTheNode = op.offset !== 0
          const deletingFromTheEnd = op.offset + op.text.length === node.text.length

          if (nodeHasAnnotations && deletingPartOfTheNode && deletingFromTheEnd) {
            Editor.withoutNormalizing(editor, () => {
              Transforms.splitNodes(editor, {
                match: Text.isText,
                at: {path: op.path, offset: op.offset},
              })
              Transforms.removeNodes(editor, {at: Path.next(op.path)})
            })

            editor.onChange()
            return
          }

          const deletingAllText = op.offset === 0 && deletingFromTheEnd

          if (nodeHasAnnotations && deletingAllText) {
            const marksWithoutAnnotationMarks: string[] = (
              {
                ...(Editor.marks(editor) || {}),
              }.marks || []
            ).filter((mark) => decorators.includes(mark))

            Editor.withoutNormalizing(editor, () => {
              apply(op)
              Transforms.setNodes(editor, {marks: marksWithoutAnnotationMarks}, {at: op.path})
            })

            editor.onChange()
            return
          }

          const nodeHasMarks = node.marks !== undefined && node.marks.length > 0

          if (nodeHasMarks && deletingAllText) {
            Editor.withoutNormalizing(editor, () => {
              apply(op)
              Transforms.setNodes(editor, {marks: []}, {at: op.path})
            })

            editor.onChange()
            return
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
        op.properties._type === types.block.name &&
        Array.isArray(op.properties.markDefs) &&
        op.properties.markDefs.length > 0 &&
        op.path[0] - 1 >= 0
      ) {
        const [targetBlock, targetPath] = Editor.node(editor, [op.path[0] - 1])

        if (editor.isTextBlock(targetBlock)) {
          const oldDefs = (Array.isArray(targetBlock.markDefs) && targetBlock.markDefs) || []
          const newMarkDefs = uniq([...oldDefs, ...op.properties.markDefs])

          debug(`Copying markDefs over to merged block`, op)
          Transforms.setNodes(editor, {markDefs: newMarkDefs}, {at: targetPath, voids: false})
          apply(op)
          return
        }
      }

      apply(op)
    }

    // Override built in addMark function
    editor.addMark = (mark: string) => {
      if (editor.selection) {
        if (Range.isExpanded(editor.selection)) {
          Editor.withoutNormalizing(editor, () => {
            // Split if needed
            Transforms.setNodes(editor, {}, {match: Text.isText, split: true})
            // Use new selection
            const splitTextNodes = Range.isRange(editor.selection)
              ? [...Editor.nodes(editor, {at: editor.selection, match: Text.isText})]
              : []
            const shouldRemoveMark =
              splitTextNodes.length > 1 &&
              splitTextNodes.every((node) => node[0].marks?.includes(mark))

            if (shouldRemoveMark) {
              editor.removeMark(mark)
            } else {
              splitTextNodes.forEach(([node, path]) => {
                const marks = [
                  ...(Array.isArray(node.marks) ? node.marks : []).filter(
                    (eMark: string) => eMark !== mark,
                  ),
                  mark,
                ]
                Transforms.setNodes(
                  editor,
                  {marks},
                  {at: path, match: Text.isText, split: true, hanging: true},
                )
              })
            }
          })
        } else {
          const existingMarks: string[] =
            {
              ...(Editor.marks(editor) || {}),
            }.marks || []
          const marks = {
            ...(Editor.marks(editor) || {}),
            marks: [...existingMarks, mark],
          }
          editor.marks = marks as Text
          forceNewSelection()
          return editor
        }
        editor.onChange()
        forceNewSelection()
      }
      return editor
    }

    // Override built in removeMark function
    editor.removeMark = (mark: string) => {
      const {selection} = editor
      if (selection) {
        if (Range.isExpanded(selection)) {
          Editor.withoutNormalizing(editor, () => {
            // Split if needed
            Transforms.setNodes(editor, {}, {match: Text.isText, split: true})
            if (editor.selection) {
              const splitTextNodes = [
                ...Editor.nodes(editor, {at: editor.selection, match: Text.isText}),
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
          })
          Editor.normalize(editor)
        } else {
          const existingMarks: string[] =
            {
              ...(Editor.marks(editor) || {}),
            }.marks || []
          const marks = {
            ...(Editor.marks(editor) || {}),
            marks: existingMarks.filter((eMark) => eMark !== mark),
          } as Text
          editor.marks = {marks: marks.marks, _type: 'span'} as Text
          forceNewSelection()
          return editor
        }
        editor.onChange()
        forceNewSelection()
      }
      return editor
    }

    editor.pteIsMarkActive = (mark: string): boolean => {
      if (!editor.selection) {
        return false
      }

      const selectedNodes = Array.from(
        Editor.nodes(editor, {match: Text.isText, at: editor.selection}),
      )

      if (Range.isExpanded(editor.selection)) {
        return selectedNodes.every((n) => {
          const [node] = n

          return node.marks?.includes(mark)
        })
      }

      return (
        {
          ...(Editor.marks(editor) || {}),
        }.marks || []
      ).includes(mark)
    }

    // Custom editor function to toggle a mark
    editor.pteToggleMark = (mark: string) => {
      const isActive = editor.pteIsMarkActive(mark)
      if (isActive) {
        debug(`Remove mark '${mark}'`)
        Editor.removeMark(editor, mark)
      } else {
        debug(`Add mark '${mark}'`)
        Editor.addMark(editor, mark, true)
      }
    }
    return editor
  }
}

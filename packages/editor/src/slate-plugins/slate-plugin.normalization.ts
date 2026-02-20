import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorActor} from '../editor/editor-machine'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {debug} from '../internal-utils/debug'
import {isEqualMarkDefs} from '../internal-utils/equality'
import {Editor, Node, Path, Range, Transforms} from '../slate'
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

      /**
       * Merge spans with same set of .marks when doing merge_node operations
       */
      if (editor.isTextBlock(node)) {
        const children = Node.children(editor, path)

        for (const [child, childPath] of children) {
          const nextNode = node.children[childPath[1]! + 1]

          if (
            editor.isTextSpan(child) &&
            editor.isTextSpan(nextNode) &&
            child.marks?.every((mark) => nextNode.marks?.includes(mark)) &&
            nextNode.marks?.every((mark) => child.marks?.includes(mark))
          ) {
            debug.normalization('merging spans with same marks')
            withNormalizeNode(editor, () => {
              Transforms.mergeNodes(editor, {
                at: [childPath[0]!, childPath[1]! + 1],
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
        debug.normalization('adding .markDefs to block node')
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
        debug.normalization('adding .style to block node')

        withNormalizeNode(editor, () => {
          Transforms.setNodes(editor, {style: defaultStyle}, {at: path})
        })
        return
      }

      /**
       * Add missing .marks to span nodes
       */
      if (editor.isTextSpan(node) && !Array.isArray(node.marks)) {
        debug.normalization('Adding .marks to span node')
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
            debug.normalization('removing annotations from empty span node')
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
              debug.normalization(
                'removing orphaned annotations from span node',
              )
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
            debug.normalization('removing orphaned annotations from span node')
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
          debug.normalization('removing duplicate markDefs')
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
              editor.isText(child) &&
              Array.isArray(child.marks) &&
              child.marks.includes(def._key)
            )
          })
        })
        if (node.markDefs && !isEqualMarkDefs(newMarkDefs, node.markDefs)) {
          debug.normalization('removing markDef not in use')
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
        op.path[0]! - 1 >= 0
      ) {
        const [targetBlock, targetPath] = Editor.node(editor, [op.path[0]! - 1])

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

          debug.normalization(`copying markDefs over to merged block`, op)
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

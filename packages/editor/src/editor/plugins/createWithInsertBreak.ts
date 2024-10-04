import {isEqual} from 'lodash'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {SlateTextBlock, VoidElement} from '../../types/slate'

export function createWithInsertBreak(
  types: PortableTextMemberSchemaTypes,
  keyGenerator: () => string,
): (editor: PortableTextSlateEditor) => PortableTextSlateEditor {
  return function withInsertBreak(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    const {insertBreak} = editor

    editor.insertBreak = () => {
      if (!editor.selection) {
        insertBreak()
        return
      }

      const [focusSpan] = Array.from(
        Editor.nodes(editor, {
          mode: 'lowest',
          at: editor.selection.focus,
          match: (n) => editor.isTextSpan(n),
          voids: false,
        }),
      )[0] ?? [undefined]
      const focusDecorators =
        focusSpan.marks?.filter((mark) =>
          types.decorators.some((decorator) => decorator.value === mark),
        ) ?? []
      const focusAnnotations =
        focusSpan.marks?.filter(
          (mark) =>
            !types.decorators.some((decorator) => decorator.value === mark),
        ) ?? []

      const focusBlockPath = editor.selection.focus.path.slice(0, 1)
      const focusBlock = Node.descendant(editor, focusBlockPath) as
        | SlateTextBlock
        | VoidElement

      if (editor.isTextBlock(focusBlock)) {
        const [start, end] = Range.edges(editor.selection)
        const isEndAtStartOfBlock = isEqual(end, {
          path: [...focusBlockPath, 0],
          offset: 0,
        })

        if (isEndAtStartOfBlock && Range.isCollapsed(editor.selection)) {
          Editor.insertNode(
            editor,
            editor.pteCreateTextBlock({
              decorators: focusAnnotations.length === 0 ? focusDecorators : [],
            }),
          )

          const [nextBlockPath] = Path.next(focusBlockPath)

          Transforms.select(editor, {
            anchor: {path: [nextBlockPath, 0], offset: 0},
            focus: {path: [nextBlockPath, 0], offset: 0},
          })

          editor.onChange()
          return
        }

        const lastFocusBlockChild =
          focusBlock.children[focusBlock.children.length - 1]
        const isStartAtEndOfBlock = isEqual(start, {
          path: [...focusBlockPath, focusBlock.children.length - 1],
          offset: editor.isTextSpan(lastFocusBlockChild)
            ? lastFocusBlockChild.text.length
            : 0,
        })

        if (
          isStartAtEndOfBlock &&
          Range.isCollapsed(editor.selection) &&
          focusDecorators.length > 0 &&
          focusAnnotations.length > 0
        ) {
          Editor.withoutNormalizing(editor, () => {
            if (!editor.selection) {
              return
            }

            Editor.insertNode(
              editor,
              editor.pteCreateTextBlock({
                decorators: [],
              }),
            )

            const [nextBlockPath] = Path.next(focusBlockPath)

            Transforms.setSelection(editor, {
              anchor: {path: [nextBlockPath, 0], offset: 0},
              focus: {path: [nextBlockPath, 0], offset: 0},
            })
          })
          editor.onChange()
          return
        }

        const isInTheMiddleOfNode = !isEndAtStartOfBlock && !isStartAtEndOfBlock

        if (isInTheMiddleOfNode) {
          Editor.withoutNormalizing(editor, () => {
            if (!editor.selection) {
              return
            }

            Transforms.splitNodes(editor, {
              at: editor.selection,
            })

            const [nextNode, nextNodePath] = Editor.node(
              editor,
              Path.next(focusBlockPath),
              {depth: 1},
            )

            Transforms.setSelection(editor, {
              anchor: {path: [...nextNodePath, 0], offset: 0},
              focus: {path: [...nextNodePath, 0], offset: 0},
            })

            /**
             * Assign new keys to markDefs that are now split across two blocks
             */
            if (
              editor.isTextBlock(nextNode) &&
              nextNode.markDefs &&
              nextNode.markDefs.length > 0
            ) {
              const newMarkDefKeys = new Map<string, string>()

              const prevNodeSpans = Array.from(
                Node.children(editor, focusBlockPath),
              )
                .map((entry) => entry[0])
                .filter((node) => editor.isTextSpan(node))
              const children = Node.children(editor, nextNodePath)

              for (const [child, childPath] of children) {
                if (!editor.isTextSpan(child)) {
                  continue
                }

                const marks = child.marks ?? []

                // Go through the marks of the span and figure out if any of
                // them refer to annotations that are also present in the
                // previous block
                for (const mark of marks) {
                  if (
                    types.decorators.some(
                      (decorator) => decorator.value === mark,
                    )
                  ) {
                    continue
                  }

                  if (
                    prevNodeSpans.some((prevNodeSpan) =>
                      prevNodeSpan.marks?.includes(mark),
                    ) &&
                    !newMarkDefKeys.has(mark)
                  ) {
                    // This annotation is both present in the previous block
                    // and this block, so let's assign a new key to it
                    newMarkDefKeys.set(mark, keyGenerator())
                  }
                }

                const newMarks = marks.map(
                  (mark) => newMarkDefKeys.get(mark) ?? mark,
                )

                // No need to update the marks if they are the same
                if (!isEqual(marks, newMarks)) {
                  Transforms.setNodes(
                    editor,
                    {marks: newMarks},
                    {
                      at: childPath,
                    },
                  )
                }
              }

              // Time to update all the markDefs that need a new key because
              // they've been split across blocks
              const newMarkDefs = nextNode.markDefs.map((markDef) => ({
                ...markDef,
                _key: newMarkDefKeys.get(markDef._key) ?? markDef._key,
              }))

              // No need to update the markDefs if they are the same
              if (!isEqual(nextNode.markDefs, newMarkDefs)) {
                Transforms.setNodes(
                  editor,
                  {markDefs: newMarkDefs},
                  {
                    at: nextNodePath,
                    match: (node) => editor.isTextBlock(node),
                  },
                )
              }
            }
          })
          editor.onChange()
          return
        }
      }

      insertBreak()
    }

    return editor
  }
}

import {isEqual} from 'lodash'
import {Editor, insertText, Node, Path, Transforms} from 'slate'
import type {SlateTextBlock, VoidElement} from '../types/slate'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBreakActionImplementation: BehaviorActionImplementation<
  'insert.break'
> = ({context, action}) => {
  const keyGenerator = context.keyGenerator
  const schema = context.schema
  const editor = action.editor

  if (!editor.selection) {
    return
  }

  const anchorBlockPath = editor.selection.anchor.path.slice(0, 1)
  const focusBlockPath = editor.selection.focus.path.slice(0, 1)
  const focusBlock = Node.descendant(editor, focusBlockPath) as
    | SlateTextBlock
    | VoidElement

  if (editor.isTextBlock(focusBlock)) {
    const selectionAcrossBlocks = anchorBlockPath[0] !== focusBlockPath[0]

    if (!selectionAcrossBlocks) {
      Transforms.splitNodes(editor, {
        at: editor.selection,
        always: true,
      })

      const [nextBlock, nextBlockPath] = Editor.node(
        editor,
        Path.next(focusBlockPath),
        {depth: 1},
      )

      const nextChild = Node.child(nextBlock, 0)
      const firstChildIsInlineObject = !editor.isTextSpan(nextChild)

      if (firstChildIsInlineObject) {
        // If the first child in the next block is an inline object then we
        // add an empty span right before it to a place to put the cursor.
        // This is a Slate constraint that we have to adhere to.
        Transforms.insertNodes(
          editor,
          {
            _key: context.keyGenerator(),
            _type: 'span',
            text: '',
            marks: [],
          },
          {
            at: [nextBlockPath[0], 0],
          },
        )
      }

      Transforms.setSelection(editor, {
        anchor: {path: [...nextBlockPath, 0], offset: 0},
        focus: {path: [...nextBlockPath, 0], offset: 0},
      })

      /**
       * Assign new keys to markDefs that are now split across two blocks
       */
      if (
        editor.isTextBlock(nextBlock) &&
        nextBlock.markDefs &&
        nextBlock.markDefs.length > 0
      ) {
        const newMarkDefKeys = new Map<string, string>()

        const prevNodeSpans = Array.from(Node.children(editor, focusBlockPath))
          .map((entry) => entry[0])
          .filter((node) => editor.isTextSpan(node))
        const children = Node.children(editor, nextBlockPath)

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
              schema.decorators.some((decorator) => decorator.value === mark)
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

          const newMarks = marks.map((mark) => newMarkDefKeys.get(mark) ?? mark)

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
        const newMarkDefs = nextBlock.markDefs.map((markDef) => ({
          ...markDef,
          _key: newMarkDefKeys.get(markDef._key) ?? markDef._key,
        }))

        // No need to update the markDefs if they are the same
        if (!isEqual(nextBlock.markDefs, newMarkDefs)) {
          Transforms.setNodes(
            editor,
            {markDefs: newMarkDefs},
            {
              at: nextBlockPath,
              match: (node) => editor.isTextBlock(node),
            },
          )
        }
      }
      return
    }
  }

  Transforms.splitNodes(editor, {always: true})
}

export const insertSoftBreakActionImplementation: BehaviorActionImplementation<
  'insert.soft break'
> = ({action}) => {
  insertText(action.editor, '\n')
}

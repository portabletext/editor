import {Editor, Path, Point, Range, Transforms, type Descendant} from 'slate'
import {DOMEditor} from 'slate-dom'
import type {EditorSchema} from '../editor/define-schema'
import {parseBlock} from '../internal-utils/parse-blocks'
import {
  getFocusBlock,
  getFocusChild,
  getLastBlock,
} from '../internal-utils/slate-utils'
import {isEqualToEmptyEditor, toSlateValue} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlockActionImplementation: BehaviorActionImplementation<
  'insert.block'
> = ({context, action}) => {
  const parsedBlock = parseBlock({
    block: action.block,
    context,
    options: {refreshKeys: false},
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${JSON.stringify(action.block)}`)
  }

  const fragment = toSlateValue([parsedBlock], {schemaTypes: context.schema})[0]

  if (!fragment) {
    throw new Error(
      `Failed to convert block to Slate fragment ${JSON.stringify(parsedBlock)}`,
    )
  }

  insertBlock({
    block: fragment,
    placement: action.placement,
    select: action.select ?? 'start',
    editor: action.editor,
    schema: context.schema,
  })
}

export function insertBlock({
  block,
  placement,
  select,
  editor,
  schema,
}: {
  block: Descendant
  placement: 'auto' | 'after' | 'before'
  select: 'start' | 'end' | 'none'
  editor: PortableTextSlateEditor
  schema: EditorSchema
}) {
  const [focusBlock, focusBlockPath] = getFocusBlock({editor})

  if (!editor.selection || !focusBlock || !focusBlockPath) {
    if (select !== 'none') {
      DOMEditor.focus(editor)
    }

    const [lastBlock, lastBlockPath] = getLastBlock({editor})

    if (placement === 'before') {
      Transforms.insertNodes(editor, [block], {at: [0]})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, [0]))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, [0]))
      }
    } else if (placement === 'after') {
      const nextPath = lastBlockPath ? [lastBlockPath[0] + 1] : [0]
      Transforms.insertNodes(editor, [block], {at: nextPath, select: false})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    } else {
      // placement === 'auto'

      if (lastBlock && isEqualToEmptyEditor([lastBlock], schema)) {
        // And if the last block was an empty text block, let's remove
        // that too
        Transforms.removeNodes(editor, {at: lastBlockPath})

        Transforms.insertNodes(editor, [block], {
          at: lastBlockPath,
          select: false,
        })

        Transforms.deselect(editor)

        if (select === 'start') {
          Transforms.select(editor, Editor.start(editor, lastBlockPath))
        } else if (select === 'end') {
          Transforms.select(editor, Editor.end(editor, lastBlockPath))
        }

        return
      }

      if (
        editor.isTextBlock(block) &&
        lastBlock &&
        editor.isTextBlock(lastBlock)
      ) {
        const selectionBefore = Editor.end(editor, lastBlockPath)

        Transforms.insertFragment(editor, [block], {
          at: Editor.end(editor, lastBlockPath),
        })

        if (select === 'start') {
          Transforms.select(editor, selectionBefore)
        } else if (select === 'none') {
          Transforms.deselect(editor)
        }

        return
      }

      const nextPath = lastBlockPath ? [lastBlockPath[0] + 1] : [0]

      Transforms.insertNodes(editor, [block], {at: nextPath, select: false})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    }
  } else {
    if (placement === 'before') {
      const currentSelection = editor.selection

      Transforms.insertNodes(editor, [block], {
        at: focusBlockPath,
        select: false,
      })

      const adjustedSelection = Range.transform(currentSelection, {
        type: 'move_node',
        path: focusBlockPath,
        newPath: [focusBlockPath[0] + 1],
      })

      if (adjustedSelection) {
        Transforms.select(editor, adjustedSelection)
      } else {
        Transforms.select(editor, currentSelection)
      }

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, focusBlockPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, focusBlockPath))
      }
    } else if (placement === 'after') {
      const nextPath = [focusBlockPath[0] + 1]

      const currentSelection = editor.selection
      Transforms.insertNodes(editor, [block], {at: nextPath, select: false})
      Transforms.select(editor, currentSelection)

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    } else {
      // placement === 'auto'

      const currentSelection = editor.selection
      const focusBlockStartPoint = Editor.start(editor, focusBlockPath)

      if (editor.isTextBlock(focusBlock) && editor.isTextBlock(block)) {
        if (select === 'end') {
          Transforms.insertFragment(editor, [block], {
            voids: true,
          })

          return
        }

        Transforms.insertFragment(editor, [block], {
          at: currentSelection,
          voids: true,
        })

        if (select === 'start') {
          if (Point.equals(currentSelection.anchor, focusBlockStartPoint)) {
            Transforms.select(editor, Editor.start(editor, focusBlockPath))
          } else {
            Transforms.select(editor, currentSelection)
          }
        } else {
          if (!Point.equals(currentSelection.anchor, focusBlockStartPoint)) {
            Transforms.select(editor, currentSelection)
          }
        }
      } else {
        if (!editor.isTextBlock(focusBlock)) {
          Transforms.insertNodes(editor, [block], {select: false})

          const nextPath = [focusBlockPath[0] + 1]

          if (select === 'start') {
            Transforms.select(editor, Editor.start(editor, nextPath))
          } else if (select === 'end') {
            Transforms.select(editor, Editor.end(editor, nextPath))
          }
        } else {
          const focusBlockStartPoint = Editor.start(editor, focusBlockPath)
          const focusBlockEndPoint = Editor.end(editor, focusBlockPath)

          if (Point.equals(currentSelection.anchor, focusBlockStartPoint)) {
            Transforms.insertNodes(editor, [block], {
              at: focusBlockPath,
              select: false,
            })

            if (select === 'start' || select === 'end') {
              Transforms.select(editor, Editor.start(editor, focusBlockPath))
            }

            if (isEqualToEmptyEditor([focusBlock], schema)) {
              Transforms.removeNodes(editor, {at: Path.next(focusBlockPath)})
            }
          } else if (Point.equals(currentSelection.focus, focusBlockEndPoint)) {
            const nextPath = [focusBlockPath[0] + 1]

            Transforms.insertNodes(editor, [block], {
              at: nextPath,
              select: false,
            })

            if (select === 'start' || select === 'end') {
              Transforms.select(editor, Editor.start(editor, nextPath))
            }
          } else {
            const currentSelection = editor.selection
            const [focusChild] = getFocusChild({editor})

            if (focusChild && editor.isTextSpan(focusChild)) {
              Transforms.insertFragment(editor, [block], {
                at: currentSelection,
              })

              if (select === 'start' || select === 'end') {
                Transforms.select(editor, [focusBlockPath[0] + 1])
              } else {
                Transforms.select(editor, currentSelection)
              }
            } else {
              const nextPath = [focusBlockPath[0] + 1]
              Transforms.insertNodes(editor, [block], {
                at: nextPath,
                select: false,
              })
              Transforms.select(editor, currentSelection)

              if (select === 'start') {
                Transforms.select(editor, Editor.start(editor, nextPath))
              } else if (select === 'end') {
                Transforms.select(editor, Editor.end(editor, nextPath))
              }
            }
          }
        }
      }
    }
  }
}

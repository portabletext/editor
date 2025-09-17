import {isSpan} from '@portabletext/schema'
import {isEqual} from 'lodash'
import {Editor, Path, Point, Range, Transforms, type Descendant} from 'slate'
import {DOMEditor} from 'slate-dom'
import {parseBlock} from '../internal-utils/parse-blocks'
import {
  getFocusBlock,
  getFocusChild,
  getLastBlock,
  getSelectionEndBlock,
  getSelectionStartBlock,
} from '../internal-utils/slate-utils'
import {isEqualToEmptyEditor, toSlateValue} from '../internal-utils/values'
import type {PortableTextSlateEditor} from '../types/editor'
import {isEmptyTextBlock} from '../utils'
import type {
  BehaviorOperationImplementation,
  BehaviorOperationImplementationContext,
} from './behavior.operations'

export const insertBlockOperationImplementation: BehaviorOperationImplementation<
  'insert.block'
> = ({context, operation}) => {
  const parsedBlock = parseBlock({
    block: operation.block,
    context,
    options: {
      removeUnusedMarkDefs: true,
      validateFields: true,
    },
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${JSON.stringify(operation.block)}`)
  }

  const fragment = toSlateValue([parsedBlock], {schemaTypes: context.schema})[0]

  if (!fragment) {
    throw new Error(
      `Failed to convert block to Slate fragment ${JSON.stringify(parsedBlock)}`,
    )
  }

  insertBlock({
    context,
    block: fragment,
    placement: operation.placement,
    select: operation.select ?? 'start',
    editor: operation.editor,
  })
}

export function insertBlock({
  context,
  block,
  placement,
  select,
  editor,
}: {
  context: BehaviorOperationImplementationContext
  block: Descendant
  placement: 'auto' | 'after' | 'before'
  select: 'start' | 'end' | 'none'
  editor: PortableTextSlateEditor
}) {
  const [startBlock, startBlockPath] = getSelectionStartBlock({editor})
  const [endBlock, endBlockPath] = getSelectionEndBlock({editor})

  if (
    !editor.selection ||
    !startBlock ||
    !startBlockPath ||
    !endBlock ||
    !endBlockPath
  ) {
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
      Transforms.insertNodes(editor, [block], {at: nextPath})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    } else {
      // placement === 'auto'

      if (lastBlock && isEqualToEmptyEditor([lastBlock], context.schema)) {
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
      const selectionStartPoint = Range.start(currentSelection)

      Transforms.insertNodes(editor, [block], {
        at: [selectionStartPoint.path[0]],
        select: false,
      })

      if (select === 'start') {
        Transforms.select(
          editor,
          Editor.start(editor, [selectionStartPoint.path[0]]),
        )
      } else if (select === 'end') {
        Transforms.select(
          editor,
          Editor.end(editor, [selectionStartPoint.path[0]]),
        )
      }
    } else if (placement === 'after') {
      const currentSelection = editor.selection
      const selectionEndPoint = Range.end(currentSelection)

      const nextPath = [selectionEndPoint.path[0] + 1]

      Transforms.insertNodes(editor, [block], {
        at: nextPath,
        select: false,
      })

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    } else {
      // placement === 'auto'

      const currentSelection = editor.selection
      const endBlockEndPoint = Editor.start(editor, endBlockPath)

      if (Range.isExpanded(currentSelection) && !editor.isTextBlock(block)) {
        Transforms.delete(editor, {at: currentSelection})

        const newSelection = editor.selection

        const [focusBlock, focusBlockPath] = getFocusBlock({editor})

        Transforms.insertNodes(editor, [block], {
          voids: true,
        })

        const adjustedSelection =
          newSelection.anchor.offset === 0
            ? Range.transform(newSelection, {
                type: 'insert_node',
                node: block,
                path: [newSelection.anchor.path[0]],
              })
            : newSelection

        if (select === 'none' && adjustedSelection) {
          Transforms.select(editor, adjustedSelection)
        }

        if (focusBlock && isEqualToEmptyEditor([focusBlock], context.schema)) {
          Transforms.removeNodes(editor, {at: focusBlockPath})
        }

        return
      }

      if (editor.isTextBlock(endBlock) && editor.isTextBlock(block)) {
        const selectionStartPoint = Range.start(currentSelection)

        if (isEqualToEmptyEditor([endBlock], context.schema)) {
          const currentSelection = editor.selection

          Transforms.insertNodes(editor, [block], {
            at: endBlockPath,
            select: false,
          })
          Transforms.removeNodes(editor, {at: Path.next(endBlockPath)})

          if (select === 'start') {
            Transforms.select(editor, selectionStartPoint)
          } else if (select === 'end') {
            Transforms.select(editor, Editor.end(editor, endBlockPath))
          } else {
            Transforms.select(editor, currentSelection)
          }

          return
        }

        const endBlockChildKeys = endBlock.children.map((child) => child._key)
        const endBlockMarkDefsKeys =
          endBlock.markDefs?.map((markDef) => markDef._key) ?? []

        // Assign new keys to markDefs with duplicate keys and keep track of
        // the mapping between the old and new keys
        const markDefKeyMap = new Map<string, string>()
        const adjustedMarkDefs = block.markDefs?.map((markDef) => {
          if (endBlockMarkDefsKeys.includes(markDef._key)) {
            const newKey = context.keyGenerator()
            markDefKeyMap.set(markDef._key, newKey)
            return {
              ...markDef,
              _key: newKey,
            }
          }

          return markDef
        })

        // Assign new keys to spans with duplicate keys and update any markDef
        // key if needed
        const adjustedChildren = block.children.map((child) => {
          if (isSpan(context, child)) {
            const marks =
              child.marks?.map((mark) => {
                const markDefKey = markDefKeyMap.get(mark)

                if (markDefKey) {
                  return markDefKey
                }

                return mark
              }) ?? []

            if (!isEqual(child.marks, marks)) {
              return {
                ...child,
                _key: endBlockChildKeys.includes(child._key)
                  ? context.keyGenerator()
                  : child._key,
                marks,
              }
            }
          }

          if (endBlockChildKeys.includes(child._key)) {
            return {
              ...child,
              _key: context.keyGenerator(),
            }
          }

          return child
        })

        // Carry over the markDefs from the incoming block to the end block
        Transforms.setNodes(
          editor,
          {
            markDefs: [
              ...(endBlock.markDefs ?? []),
              ...(adjustedMarkDefs ?? []),
            ],
          },
          {
            at: endBlockPath,
          },
        )

        // If the children have changed, we need to create a new block with
        // the adjusted children
        const adjustedBlock = !isEqual(block.children, adjustedChildren)
          ? {
              ...block,
              children: adjustedChildren as Descendant[],
            }
          : block

        if (select === 'end') {
          Transforms.insertFragment(editor, [adjustedBlock], {
            voids: true,
          })

          return
        }

        Transforms.insertFragment(editor, [adjustedBlock], {
          at: currentSelection,
          voids: true,
        })

        if (select === 'start') {
          Transforms.select(editor, selectionStartPoint)
        } else {
          if (!Point.equals(selectionStartPoint, endBlockEndPoint)) {
            Transforms.select(editor, selectionStartPoint)
          }
        }
      } else {
        if (!editor.isTextBlock(endBlock)) {
          Transforms.insertNodes(editor, [block], {select: false})

          const nextPath = [endBlockPath[0] + 1]

          if (select === 'start') {
            Transforms.select(editor, Editor.start(editor, nextPath))
          } else if (select === 'end') {
            Transforms.select(editor, Editor.end(editor, nextPath))
          }
        } else {
          const endBlockStartPoint = Editor.start(editor, endBlockPath)
          const endBlockEndPoint = Editor.end(editor, endBlockPath)
          const selectionStartPoint = Range.start(currentSelection)
          const selectionEndPoint = Range.end(currentSelection)

          if (
            Range.isCollapsed(currentSelection) &&
            Point.equals(selectionStartPoint, endBlockStartPoint)
          ) {
            Transforms.insertNodes(editor, [block], {
              at: endBlockPath,
              select: false,
            })

            if (select === 'start' || select === 'end') {
              Transforms.select(editor, Editor.start(editor, endBlockPath))
            }

            if (isEmptyTextBlock(context, endBlock)) {
              Transforms.removeNodes(editor, {at: Path.next(endBlockPath)})
            }
          } else if (
            Range.isCollapsed(currentSelection) &&
            Point.equals(selectionEndPoint, endBlockEndPoint)
          ) {
            const nextPath = [endBlockPath[0] + 1]

            Transforms.insertNodes(editor, [block], {
              at: nextPath,
              select: false,
            })

            if (select === 'start' || select === 'end') {
              Transforms.select(editor, Editor.start(editor, nextPath))
            }
          } else if (
            Range.isExpanded(currentSelection) &&
            Point.equals(selectionStartPoint, endBlockStartPoint) &&
            Point.equals(selectionEndPoint, endBlockEndPoint)
          ) {
            Transforms.insertFragment(editor, [block], {
              at: currentSelection,
            })

            if (select === 'start') {
              Transforms.select(editor, Editor.start(editor, endBlockPath))
            } else if (select === 'end') {
              Transforms.select(editor, Editor.end(editor, endBlockPath))
            }
          } else if (
            Range.isExpanded(currentSelection) &&
            Point.equals(selectionStartPoint, endBlockStartPoint)
          ) {
            Transforms.insertFragment(editor, [block], {
              at: currentSelection,
            })

            if (select === 'start') {
              Transforms.select(editor, Editor.start(editor, endBlockPath))
            } else if (select === 'end') {
              Transforms.select(editor, Editor.end(editor, endBlockPath))
            }
          } else if (
            Range.isExpanded(currentSelection) &&
            Point.equals(selectionEndPoint, endBlockEndPoint)
          ) {
            Transforms.insertFragment(editor, [block], {
              at: currentSelection,
            })

            if (select === 'start') {
              Transforms.select(
                editor,
                Editor.start(editor, Path.next(endBlockPath)),
              )
            } else if (select === 'end') {
              Transforms.select(
                editor,
                Editor.end(editor, Path.next(endBlockPath)),
              )
            }
          } else {
            const currentSelection = editor.selection
            const [focusChild] = getFocusChild({editor})

            if (focusChild && editor.isTextSpan(focusChild)) {
              Transforms.splitNodes(editor, {
                at: currentSelection,
              })

              Transforms.insertFragment(editor, [block], {
                at: currentSelection,
              })

              if (select === 'start' || select === 'end') {
                Transforms.select(editor, [endBlockPath[0] + 1])
              } else {
                Transforms.select(editor, currentSelection)
              }
            } else {
              const nextPath = [endBlockPath[0] + 1]
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

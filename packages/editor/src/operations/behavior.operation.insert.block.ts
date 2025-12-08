import {isSpan} from '@portabletext/schema'
import {isEqual} from 'lodash'
import {
  Editor,
  Element,
  Path,
  Point,
  Range,
  Transforms,
  type Descendant,
} from 'slate'
import {DOMEditor} from 'slate-dom'
import {createPlaceholderBlock} from '../internal-utils/create-placeholder-block'
import {getFocusBlock, getFocusChild} from '../internal-utils/slate-utils'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {toSlateBlock} from '../internal-utils/values'
import type {EditorSelection} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {parseBlock} from '../utils/parse-blocks'
import {isEmptyTextBlock} from '../utils/util.is-empty-text-block'
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
      normalize: true,
      removeUnusedMarkDefs: true,
      validateFields: true,
    },
  })

  if (!parsedBlock) {
    throw new Error(`Failed to parse block ${JSON.stringify(operation.block)}`)
  }

  const block = toSlateBlock(parsedBlock, {schemaTypes: context.schema})

  insertBlock({
    context,
    block,
    placement: operation.placement,
    select: operation.select ?? 'start',
    at: operation.at,
    editor: operation.editor,
  })
}

export function insertBlock(options: {
  context: BehaviorOperationImplementationContext
  block: Descendant
  placement: 'auto' | 'after' | 'before'
  select: 'start' | 'end' | 'none'
  at?: NonNullable<EditorSelection>
  editor: PortableTextSlateEditor
}) {
  const {context, block, placement, select, editor} = options
  const at = options.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: editor.value,
          selection: options.at,
        },
        blockIndexMap: editor.blockIndexMap,
      })
    : editor.selection

  if (editor.children.length === 0) {
    Transforms.insertNodes(editor, createPlaceholderBlock(context), {at: [0]})
  }

  // Fall back to the start and end of the editor if neither an editor
  // selection nor an `at` range is provided
  const start = at ? Range.start(at) : Editor.start(editor, [])
  const end = at ? Range.end(at) : Editor.end(editor, [])

  const [startBlock, startBlockPath] = Array.from(
    Editor.nodes(editor, {
      at: start,
      mode: 'lowest',
      match: (node, path) =>
        Element.isElement(node) && path.length <= start.path.length,
    }),
  ).at(0) ?? [undefined, undefined]
  const [endBlock, endBlockPath] = Array.from(
    Editor.nodes(editor, {
      at: end,
      mode: 'lowest',
      match: (node, path) =>
        Element.isElement(node) && path.length <= end.path.length,
    }),
  ).at(0) ?? [undefined, undefined]

  if (!startBlock || !startBlockPath || !endBlock || !endBlockPath) {
    throw new Error('Unable to insert block without a start and end block')
  }

  if (!editor.selection && select !== 'none') {
    DOMEditor.focus(editor)
  }

  if (!at) {
    if (placement === 'before') {
      Transforms.insertNodes(editor, [block], {at: [0]})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, [0]))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, [0]))
      }
    } else if (placement === 'after') {
      const nextPath = Path.next(endBlockPath)
      Transforms.insertNodes(editor, [block], {at: nextPath})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    } else {
      // placement === 'auto'

      if (isEmptyTextBlock(context, endBlock)) {
        Transforms.insertNodes(editor, [block], {
          at: endBlockPath,
          select: false,
        })

        // And if the last block was an empty text block, let's remove
        // that too
        Transforms.removeNodes(editor, {at: Path.next(endBlockPath)})

        Transforms.deselect(editor)

        if (select === 'start') {
          Transforms.select(editor, Editor.start(editor, endBlockPath))
        } else if (select === 'end') {
          Transforms.select(editor, Editor.end(editor, endBlockPath))
        }

        return
      }

      if (
        editor.isTextBlock(block) &&
        endBlock &&
        editor.isTextBlock(endBlock)
      ) {
        const selectionBefore = Editor.end(editor, endBlockPath)

        Transforms.insertFragment(editor, [block], {
          at: Editor.end(editor, endBlockPath),
        })

        if (select === 'start') {
          Transforms.select(editor, selectionBefore)
        } else if (select === 'none') {
          Transforms.deselect(editor)
        }

        return
      }

      const nextPath = Path.next(endBlockPath)

      Transforms.insertNodes(editor, [block], {at: nextPath, select: false})

      if (select === 'start') {
        Transforms.select(editor, Editor.start(editor, nextPath))
      } else if (select === 'end') {
        Transforms.select(editor, Editor.end(editor, nextPath))
      }
    }

    return
  }

  if (!at) {
    throw new Error('Unable to insert block without a selection')
  }

  if (placement === 'before') {
    Transforms.insertNodes(editor, [block], {
      at: startBlockPath,
      select: false,
    })

    if (select === 'start') {
      Transforms.select(editor, Editor.start(editor, startBlockPath))
    } else if (select === 'end') {
      Transforms.select(editor, Editor.end(editor, startBlockPath))
    }
  } else if (placement === 'after') {
    const nextPath = Path.next(endBlockPath)

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

    const endBlockEndPoint = Editor.start(editor, endBlockPath)

    if (Range.isExpanded(at) && !editor.isTextBlock(block)) {
      const atBeforeDelete = Editor.rangeRef(editor, at, {affinity: 'inward'})

      Transforms.delete(editor, {at})

      const [focusBlock, focusBlockPath] = getFocusBlock({editor})

      const atAfterDelete = atBeforeDelete.unref() ?? editor.selection

      const atBeforeInsert = atAfterDelete
        ? Editor.rangeRef(editor, atAfterDelete, {affinity: 'inward'})
        : undefined

      Transforms.insertNodes(editor, [block], {
        voids: true,
        at: atAfterDelete ?? undefined,
        select: select !== 'none',
      })

      const atAfterInsert = atBeforeInsert?.unref() ?? editor.selection

      if (select === 'none' && atAfterInsert) {
        Transforms.select(editor, atAfterInsert)
      }

      if (isEmptyTextBlock(context, focusBlock)) {
        Transforms.removeNodes(editor, {at: focusBlockPath})
      }

      return
    }

    if (editor.isTextBlock(endBlock) && editor.isTextBlock(block)) {
      const selectionStartPoint = Range.start(at)

      if (isEmptyTextBlock(context, endBlock)) {
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
          Transforms.select(editor, at)
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
          markDefs: [...(endBlock.markDefs ?? []), ...(adjustedMarkDefs ?? [])],
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
        at,
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
        const selectionStartPoint = Range.start(at)
        const selectionEndPoint = Range.end(at)

        if (
          Range.isCollapsed(at) &&
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
          Range.isCollapsed(at) &&
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
          Range.isExpanded(at) &&
          Point.equals(selectionStartPoint, endBlockStartPoint) &&
          Point.equals(selectionEndPoint, endBlockEndPoint)
        ) {
          Transforms.insertFragment(editor, [block], {
            at,
          })

          if (select === 'start') {
            Transforms.select(editor, Editor.start(editor, endBlockPath))
          } else if (select === 'end') {
            Transforms.select(editor, Editor.end(editor, endBlockPath))
          }
        } else if (
          Range.isExpanded(at) &&
          Point.equals(selectionStartPoint, endBlockStartPoint)
        ) {
          Transforms.insertFragment(editor, [block], {
            at,
          })

          if (select === 'start') {
            Transforms.select(editor, Editor.start(editor, endBlockPath))
          } else if (select === 'end') {
            Transforms.select(editor, Editor.end(editor, endBlockPath))
          }
        } else if (
          Range.isExpanded(at) &&
          Point.equals(selectionEndPoint, endBlockEndPoint)
        ) {
          Transforms.insertFragment(editor, [block], {
            at,
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
          const [focusChild] = getFocusChild({editor})

          if (focusChild && editor.isTextSpan(focusChild)) {
            Transforms.splitNodes(editor, {
              at,
            })

            Transforms.insertFragment(editor, [block], {
              at,
            })

            if (select === 'start' || select === 'end') {
              Transforms.select(editor, [endBlockPath[0] + 1])
            } else {
              Transforms.select(editor, at)
            }
          } else {
            const nextPath = [endBlockPath[0] + 1]
            Transforms.insertNodes(editor, [block], {
              at: nextPath,
              select: false,
            })
            Transforms.select(editor, at)

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

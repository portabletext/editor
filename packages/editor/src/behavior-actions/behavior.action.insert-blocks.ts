import {parseBlocks} from '../internal-utils/parse-blocks'
import {getFocusBlock} from '../internal-utils/slate-utils'
import {toSlateValue} from '../internal-utils/values'
import {insertBreakActionImplementation} from './behavior.action.insert-break'
import {insertBlock} from './behavior.action.insert.block'
import {selectNextBlockActionImplementation} from './behavior.action.select.next-block'
import {selectPreviousBlockActionImplementation} from './behavior.action.select.previous-block'
import type {BehaviorActionImplementation} from './behavior.actions'

export const insertBlocksActionImplementation: BehaviorActionImplementation<
  'insert.blocks'
> = ({context, action}) => {
  const parsedBlocks = parseBlocks({
    context,
    blocks: action.blocks,
    options: {refreshKeys: false},
  })

  if (parsedBlocks.length === 0) {
    throw new Error(`Failed to parse blocks ${JSON.stringify(action.blocks)}`)
  }

  const fragment = toSlateValue(parsedBlocks, {schemaTypes: context.schema})

  if (fragment.length === 0) {
    throw new Error(
      `Failed to convert blocks to Slate fragment ${JSON.stringify(
        parsedBlocks,
      )}`,
    )
  }

  const [focusBlock] = getFocusBlock({editor: action.editor})

  if (action.placement === 'before') {
    let index = 0

    for (const block of fragment) {
      insertBlock({
        block,
        placement: index === 0 ? 'before' : 'after',
        select: 'end',
        editor: action.editor,
        schema: context.schema,
      })

      index++
    }
  } else if (action.placement === 'after') {
    for (const block of fragment) {
      insertBlock({
        block,
        placement: 'after',
        select: 'end',
        editor: action.editor,
        schema: context.schema,
      })
    }
  } else {
    if (focusBlock && action.editor.isTextBlock(focusBlock)) {
      if (fragment.length === 1) {
        insertBlock({
          block: fragment[0],
          placement: 'auto',
          select: 'end',
          editor: action.editor,
          schema: context.schema,
        })

        return
      }

      let index = 0

      for (const block of fragment) {
        if (index === 0) {
          insertBreakActionImplementation({
            context,
            action: {type: 'insert.break', editor: action.editor},
          })
          selectPreviousBlockActionImplementation({
            context,
            action: {
              type: 'select.previous block',
              editor: action.editor,
              select: 'end',
            },
          })
          insertBlock({
            block,
            placement: 'auto',
            select: 'end',
            editor: action.editor,
            schema: context.schema,
          })
        } else if (index === fragment.length - 1) {
          selectNextBlockActionImplementation({
            context,
            action: {
              type: 'select.next block',
              editor: action.editor,
              select: 'start',
            },
          })
          insertBlock({
            block,
            placement: 'auto',
            select: 'end',
            editor: action.editor,
            schema: context.schema,
          })
        } else {
          insertBlock({
            block,
            placement: 'after',
            select: 'end',
            editor: action.editor,
            schema: context.schema,
          })
        }

        index++
      }
    } else {
      for (const block of fragment) {
        insertBlock({
          block,
          placement: 'auto',
          select: 'end',
          editor: action.editor,
          schema: context.schema,
        })
      }
    }
  }
}

import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

const atTheEndOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const selectionCollapsed = selectors.isSelectionCollapsed({context})

    if (!context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const atTheEndOfBlock = selectors.isAtTheEndOfBlock(focusTextBlock)({
      context,
    })

    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    if (atTheEndOfBlock) {
      return {focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    ({context}, {focusListItem, focusLevel}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: context.schema.block.name,
          _key: context.keyGenerator(),
          children: [
            {
              _key: context.keyGenerator(),
              _type: context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          listItem: focusListItem,
          level: focusLevel,
          style: context.schema.styles[0]?.value,
        },
        placement: 'after',
      }),
    ],
  ],
})

const atTheStartOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({context}) => {
    const focusTextBlock = selectors.getFocusTextBlock({context})
    const selectionCollapsed = selectors.isSelectionCollapsed({context})

    if (!context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const focusSpan = selectors.getFocusSpan({context})

    const focusDecorators = focusSpan?.node.marks?.filter(
      (mark) =>
        context.schema.decorators.some(
          (decorator) => decorator.value === mark,
        ) ?? [],
    )
    const focusAnnotations =
      focusSpan?.node.marks?.filter(
        (mark) =>
          !context.schema.decorators.some(
            (decorator) => decorator.value === mark,
          ),
      ) ?? []
    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    const atTheStartOfBlock = selectors.isAtTheStartOfBlock(focusTextBlock)({
      context,
    })

    if (atTheStartOfBlock) {
      return {focusAnnotations, focusDecorators, focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    (
      {context},
      {focusAnnotations, focusDecorators, focusListItem, focusLevel},
    ) => [
      raise({
        type: 'insert.block',
        block: {
          _key: context.keyGenerator(),
          _type: context.schema.block.name,
          children: [
            {
              _key: context.keyGenerator(),
              _type: context.schema.span.name,
              marks: focusAnnotations.length === 0 ? focusDecorators : [],
              text: '',
            },
          ],
          listItem: focusListItem,
          level: focusLevel,
          style: context.schema.styles[0]?.value,
        },
        placement: 'before',
      }),
    ],
  ],
})

export const coreInsertBreakBehaviors = {
  atTheEndOfTextBlock,
  atTheStartOfTextBlock,
}

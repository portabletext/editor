import * as selectors from '../selectors'
import {defineBehavior, raise} from './behavior.types'

const breakingAtTheEndOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const atTheEndOfBlock =
      selectors.isAtTheEndOfBlock(focusTextBlock)(snapshot)

    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    if (atTheEndOfBlock) {
      return {focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    ({snapshot}, {focusListItem, focusLevel}) => [
      raise({
        type: 'insert.block',
        block: {
          _type: snapshot.context.schema.block.name,
          _key: snapshot.context.keyGenerator(),
          children: [
            {
              _key: snapshot.context.keyGenerator(),
              _type: snapshot.context.schema.span.name,
              text: '',
              marks: [],
            },
          ],
          markDefs: [],
          listItem: focusListItem,
          level: focusLevel,
          style: snapshot.context.schema.styles[0]?.value,
        },
        placement: 'after',
      }),
    ],
  ],
})

const breakingAtTheStartOfTextBlock = defineBehavior({
  on: 'insert.break',
  guard: ({snapshot}) => {
    const focusTextBlock = selectors.getFocusTextBlock(snapshot)
    const selectionCollapsed = selectors.isSelectionCollapsed(snapshot)

    if (!snapshot.context.selection || !focusTextBlock || !selectionCollapsed) {
      return false
    }

    const focusSpan = selectors.getFocusSpan(snapshot)

    const focusDecorators = focusSpan?.node.marks?.filter(
      (mark) =>
        snapshot.context.schema.decorators.some(
          (decorator) => decorator.value === mark,
        ) ?? [],
    )
    const focusAnnotations =
      focusSpan?.node.marks?.filter(
        (mark) =>
          !snapshot.context.schema.decorators.some(
            (decorator) => decorator.value === mark,
          ),
      ) ?? []
    const focusListItem = focusTextBlock.node.listItem
    const focusLevel = focusTextBlock.node.level

    const atTheStartOfBlock =
      selectors.isAtTheStartOfBlock(focusTextBlock)(snapshot)

    if (atTheStartOfBlock) {
      return {focusAnnotations, focusDecorators, focusListItem, focusLevel}
    }

    return false
  },
  actions: [
    (
      {snapshot},
      {focusAnnotations, focusDecorators, focusListItem, focusLevel},
    ) => [
      raise({
        type: 'insert.block',
        block: {
          _key: snapshot.context.keyGenerator(),
          _type: snapshot.context.schema.block.name,
          children: [
            {
              _key: snapshot.context.keyGenerator(),
              _type: snapshot.context.schema.span.name,
              marks: focusAnnotations.length === 0 ? focusDecorators : [],
              text: '',
            },
          ],
          listItem: focusListItem,
          level: focusLevel,
          style: snapshot.context.schema.styles[0]?.value,
        },
        placement: 'before',
        select: 'none',
      }),
    ],
  ],
})

export const coreInsertBreakBehaviors = {
  breakingAtTheEndOfTextBlock,
  breakingAtTheStartOfTextBlock,
}

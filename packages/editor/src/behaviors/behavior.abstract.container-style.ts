import {getAncestorTextBlock} from '../traversal'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractContainerStyleBehaviors = [
  // `style.add` inside a container
  defineBehavior({
    on: 'style.add',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      const focusPath = snapshot.context.selection.focus.path
      const anchorPath = snapshot.context.selection.anchor.path

      const focusTextBlock = getAncestorTextBlock(snapshot, focusPath)
      const anchorTextBlock = getAncestorTextBlock(snapshot, anchorPath)

      if (!focusTextBlock || !anchorTextBlock) {
        return false
      }

      // Only handle container selections (path length > 1 means inside a container)
      if (focusTextBlock.path.length <= 1 && anchorTextBlock.path.length <= 1) {
        return false
      }

      // Collect unique text blocks
      const textBlocks = new Map<
        string,
        {node: typeof focusTextBlock.node; path: typeof focusTextBlock.path}
      >()

      const focusKey = focusTextBlock.node._key
      const anchorKey = anchorTextBlock.node._key

      textBlocks.set(focusKey, focusTextBlock)
      if (anchorKey !== focusKey) {
        textBlocks.set(anchorKey, anchorTextBlock)
      }

      return {textBlocks: [...textBlocks.values()]}
    },
    actions: [
      ({event}, {textBlocks}) =>
        textBlocks.map((block) =>
          raise({
            type: 'set',
            at: block.path,
            props: {
              style: event.style,
            },
          }),
        ),
    ],
  }),

  // `style.remove` inside a container
  defineBehavior({
    on: 'style.remove',
    guard: ({snapshot}) => {
      if (!snapshot.context.selection) {
        return false
      }

      const focusPath = snapshot.context.selection.focus.path
      const anchorPath = snapshot.context.selection.anchor.path

      const focusTextBlock = getAncestorTextBlock(snapshot, focusPath)
      const anchorTextBlock = getAncestorTextBlock(snapshot, anchorPath)

      if (!focusTextBlock || !anchorTextBlock) {
        return false
      }

      if (focusTextBlock.path.length <= 1 && anchorTextBlock.path.length <= 1) {
        return false
      }

      const textBlocks = new Map<
        string,
        {node: typeof focusTextBlock.node; path: typeof focusTextBlock.path}
      >()

      textBlocks.set(focusTextBlock.node._key, focusTextBlock)
      if (anchorTextBlock.node._key !== focusTextBlock.node._key) {
        textBlocks.set(anchorTextBlock.node._key, anchorTextBlock)
      }

      return {textBlocks: [...textBlocks.values()]}
    },
    actions: [
      ({event}, {textBlocks}) =>
        textBlocks.map((block) =>
          raise({
            type: 'set',
            at: block.path,
            props: {
              style: event.style,
            },
          }),
        ),
    ],
  }),
]

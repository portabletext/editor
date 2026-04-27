import {isTextBlock} from '@portabletext/schema'
import {getNode} from '../node-traversal/get-node'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.set',
    guard: ({snapshot, event}) => {
      const markDefSegment = event.at.at(-1)

      if (!isKeyedSegment(markDefSegment)) {
        return false
      }

      const markDefKey = markDefSegment._key

      // The annotation's path ends in `..., 'markDefs', {_key}`. Strip the
      // two trailing segments to get the enclosing text block's path,
      // which works at any container depth.
      const blockPath = event.at.slice(0, -2)
      const blockEntry = getNode(snapshot.context, blockPath)

      if (!blockEntry || !isTextBlock(snapshot.context, blockEntry.node)) {
        return false
      }

      const block = blockEntry.node

      const updatedMarkDefs = block.markDefs?.map((markDef) => {
        if (markDef._key === markDefKey) {
          return {
            ...markDef,
            ...event.props,
          }
        }

        return markDef
      })

      return {blockPath: blockEntry.path, updatedMarkDefs}
    },
    actions: [
      (_, {blockPath, updatedMarkDefs}) => [
        raise({
          type: 'block.set',
          at: blockPath,
          props: {markDefs: updatedMarkDefs},
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) => {
      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      return isActiveAnnotation(event.annotation.name)(adjustedSnapshot)
    },
    actions: [
      ({event}) => [
        raise({
          type: 'annotation.remove',
          annotation: event.annotation,
          at: event.at,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'annotation.toggle',
    guard: ({snapshot, event}) => {
      const at = event.at ?? snapshot.context.selection

      if (!at) {
        return false
      }

      const adjustedSnapshot = {
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: at,
        },
      }

      return !isActiveAnnotation(event.annotation.name)(adjustedSnapshot)
    },
    actions: [
      ({event}) => [
        raise({
          type: 'annotation.add',
          annotation: event.annotation,
          at: event.at,
        }),
      ],
    ],
  }),
]

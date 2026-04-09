import {getTextBlockNode} from '../node-traversal/get-text-block-node'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.set',
    guard: ({snapshot, event}) => {
      const blockKey = event.at[0]._key
      const markDefKey = event.at[2]._key

      const block = getTextBlockNode(snapshot.context, [{_key: blockKey}])

      if (!block) {
        return false
      }

      const updatedMarkDefs = block.node.markDefs?.map((markDef) => {
        if (markDef._key === markDefKey) {
          return {
            ...markDef,
            ...event.props,
          }
        }

        return markDef
      })

      return {blockKey, updatedMarkDefs}
    },
    actions: [
      (_, {blockKey, updatedMarkDefs}) => [
        raise({
          type: 'block.set',
          at: [{_key: blockKey}],
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

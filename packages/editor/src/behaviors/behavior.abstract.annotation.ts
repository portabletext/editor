import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.set',
    guard: ({snapshot, event}) => {
      const blockSegment = event.at.at(0)
      const markDefSegment = event.at.at(-1)

      if (!isKeyedSegment(blockSegment) || !isKeyedSegment(markDefSegment)) {
        return false
      }

      const blockKey = blockSegment._key
      const markDefKey = markDefSegment._key

      const block = getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: [{_key: blockKey}],
              offset: 0,
            },
            focus: {
              path: [{_key: blockKey}],
              offset: 0,
            },
          },
        },
      })

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

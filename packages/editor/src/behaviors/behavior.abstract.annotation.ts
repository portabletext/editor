import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {getAnnotationKeyFromPath} from '../utils/util.path-helpers'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractAnnotationBehaviors = [
  defineBehavior({
    on: 'annotation.set',
    guard: ({snapshot, event}) => {
      // Extract block path (everything before 'markDefs') and annotation key (last segment)
      const markDefsIndex = event.at.indexOf('markDefs')
      const blockPath =
        markDefsIndex > 0 ? event.at.slice(0, markDefsIndex) : [event.at[0]]
      const markDefKey = getAnnotationKeyFromPath(event.at)

      const block = getFocusTextBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: {
            anchor: {
              path: blockPath as Array<{_key: string}>,
              offset: 0,
            },
            focus: {
              path: blockPath as Array<{_key: string}>,
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

      return {blockPath: blockPath as Array<{_key: string}>, updatedMarkDefs}
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

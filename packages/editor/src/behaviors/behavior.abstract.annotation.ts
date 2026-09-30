import {isTextBlock} from '@portabletext/schema'
import {isActiveAnnotation} from '../selectors/selector.is-active-annotation'
import {getNode} from '../traversal/get-node'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {parseMarkDefs} from '../utils/parse-blocks'
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
      const blockEntry = getNode(snapshot, blockPath)

      if (!blockEntry || !isTextBlock(snapshot.context, blockEntry.node)) {
        return false
      }

      const markDef = blockEntry.node.markDefs?.find(
        (markDef) => markDef._key === markDefKey,
      )

      if (!markDef) {
        return false
      }

      const {_key, ...fields} = event.props

      const [updatedMarkDef] = parseMarkDefs({
        schema: getPathSubSchema(snapshot, blockEntry.path),
        keyGenerator: snapshot.context.keyGenerator,
        markDefs: [{...markDef, ...fields}],
        profile: 'strict',
      }).markDefs

      return {
        markDefPath: [...blockEntry.path, 'markDefs', {_key: markDefKey}],
        updatedMarkDef,
      }
    },
    actions: [
      (_, {markDefPath, updatedMarkDef}) => [
        updatedMarkDef
          ? raise({type: 'set', at: markDefPath, value: updatedMarkDef})
          : raise({type: 'unset', at: markDefPath}),
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

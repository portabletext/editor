import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import type {EditorSelection} from '../types/editor'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractSerializeBehaviors = [
  defineBehavior({
    on: 'serialize',
    actions: [
      ({event}) => [
        raise({
          type: 'serialize.data',
          mimeType: 'application/x-portable-text',
          originEvent: event.originEvent,
          at: event.at,
          fragment: event.fragment,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'application/json',
          originEvent: event.originEvent,
          at: event.at,
          fragment: event.fragment,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/markdown',
          originEvent: event.originEvent,
          at: event.at,
          fragment: event.fragment,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/html',
          originEvent: event.originEvent,
          at: event.at,
          fragment: event.fragment,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/plain',
          originEvent: event.originEvent,
          at: event.at,
          fragment: event.fragment,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'serialize.data',
    guard: ({snapshot, event}) => {
      const converter = snapshot.context.converters.find(
        (converter) => converter.mimeType === event.mimeType,
      )

      if (!converter) {
        return false
      }

      // `fragment` and `at` name the serialization subject: which content
      // and which range of it. Resolve them into the snapshot so converters
      // see the subject through plain `snapshot.context` reads. With a
      // `fragment` but no `at`, the range defaults to the fragment's full
      // span.
      const value = event.fragment ?? snapshot.context.value
      const selection =
        event.at ??
        (event.fragment
          ? fullSpan(snapshot, event.fragment)
          : snapshot.context.selection)
      const snapshotForConverter =
        event.fragment || event.at
          ? {
              ...snapshot,
              context: {...snapshot.context, value, selection},
            }
          : snapshot

      return converter.serialize({
        snapshot: snapshotForConverter,
        event: {
          type: 'serialize',
          originEvent: event.originEvent.type,
        },
      })
    },
    actions: [
      ({event}, serializeEvent) => [
        raise({
          ...serializeEvent,
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'serialization.success',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            event.originEvent.originEvent.dataTransfer.setData(
              event.mimeType,
              event.data,
            )
          },
        },
      ],
    ],
  }),
  defineBehavior({
    on: 'serialization.failure',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            console.warn(
              `Serialization of ${event.mimeType} failed with reason "${event.reason}"`,
            )
          },
        },
      ],
    ],
  }),
]

/**
 * A selection spanning the whole fragment, from the start of its first
 * block to the end of its last. The block points descend into containers,
 * so a table fragment spans its first cell's first leaf to its last cell's
 * last leaf.
 */
function fullSpan(
  snapshot: {context: {schema: EditorSchema}},
  fragment: Array<PortableTextBlock>,
): EditorSelection {
  const firstBlock = fragment[0]
  const lastBlock = fragment[fragment.length - 1]
  if (!firstBlock || !lastBlock) {
    return null
  }
  return {
    anchor: getBlockStartPoint({
      context: snapshot.context,
      block: {node: firstBlock, path: [{_key: firstBlock._key}]},
    }),
    focus: getBlockEndPoint({
      context: snapshot.context,
      block: {node: lastBlock, path: [{_key: lastBlock._key}]},
    }),
  }
}

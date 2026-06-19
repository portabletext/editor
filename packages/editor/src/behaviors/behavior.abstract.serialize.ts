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
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'application/json',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/markdown',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/html',
          originEvent: event.originEvent,
        }),
        raise({
          type: 'serialize.data',
          mimeType: 'text/plain',
          originEvent: event.originEvent,
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

      // Drag origins carry the grabbed selection on the originating event;
      // the drag pipeline does not update `snapshot.context.selection` on
      // dragstart, so override the snapshot here so converters see the
      // grabbed unit through plain `snapshot.context.selection` reads.
      const snapshotForConverter =
        event.originEvent.type === 'drag.dragstart'
          ? {
              ...snapshot,
              context: {
                ...snapshot.context,
                selection: event.originEvent.position.selection,
              },
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

import {isTextBlock} from '@portabletext/schema'
import type {MIMEType} from '../internal-utils/mime-type'
import {getActiveAnnotations} from '../selectors/selector.get-active-annotations'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'
import {getTextBlockText} from '../utils/util.get-text-block-text'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

const mimeTypePriority: Array<MIMEType> = [
  'application/x-portable-text',
  'application/json',
  'text/markdown',
  'text/html',
  'text/plain',
]

/**
 * Finds the first available data from the dataTransfer based on priority.
 * Optionally starts from a specific mime type in the priority list.
 */
function getFirstAvailableData({
  dataTransfer,
  startAfter,
}: {
  dataTransfer: DataTransfer
  startAfter?: MIMEType
}): {mimeType: MIMEType; data: string} | undefined {
  const startIndex = startAfter ? mimeTypePriority.indexOf(startAfter) + 1 : 0

  for (let index = startIndex; index < mimeTypePriority.length; index++) {
    const mimeType = mimeTypePriority.at(index)

    if (!mimeType) {
      continue
    }

    const data = dataTransfer.getData(mimeType)

    if (!data) {
      continue
    }

    return {
      mimeType,
      data,
    }
  }

  return undefined
}

export const abstractDeserializeBehaviors = [
  defineBehavior({
    on: 'deserialize',
    guard: ({event}) => {
      const availableData = getFirstAvailableData({
        dataTransfer: event.originEvent.originEvent.dataTransfer,
      })

      if (!availableData) {
        return false
      }

      return {
        type: 'deserialize.data' as const,
        mimeType: availableData.mimeType,
        data: availableData.data,
        originEvent: event.originEvent,
      }
    },
    actions: [(_, deserializeEvent) => [raise(deserializeEvent)]],
  }),
  defineBehavior({
    on: 'deserialize',
    actions: [
      ({event}) => [
        raise({
          type: 'deserialization.failure',
          mimeType: '*/*',
          reason: 'No Behavior was able to handle the incoming data',
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'deserialize.data',
    guard: ({snapshot, event}) => {
      const converter = snapshot.context.converters.find(
        (converter) => converter.mimeType === event.mimeType,
      )

      if (!converter) {
        return false
      }

      return converter.deserialize({
        snapshot,
        event: {
          type: 'deserialize',
          data: event.data,
        },
      })
    },
    actions: [
      ({event}, deserializeEvent) => [
        raise({
          ...deserializeEvent,
          originEvent: event.originEvent,
        }),
      ],
    ],
  }),
  /**
   * If we are pasting text/plain into a text block then we can probably
   * assume that the intended behavior is that the pasted text inherits
   * formatting from the text it's pasted into.
   */
  defineBehavior({
    on: 'deserialization.success',
    guard: ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (
        focusTextBlock &&
        event.mimeType === 'text/plain' &&
        event.originEvent.type === 'clipboard.paste'
      ) {
        const activeDecorators = getActiveDecorators(snapshot)
        const activeAnnotations = getActiveAnnotations(snapshot)

        return {
          activeAnnotations,
          activeDecorators,
          textRuns: event.data.flatMap((block) =>
            isTextBlock(snapshot.context, block)
              ? [getTextBlockText(block)]
              : [],
          ),
        }
      }

      return false
    },
    actions: [
      (_, {activeAnnotations, activeDecorators, textRuns}) =>
        textRuns.flatMap((textRun, index) =>
          index !== textRuns.length - 1
            ? [
                raise({
                  type: 'insert.span',
                  text: textRun,
                  decorators: activeDecorators,
                  annotations: activeAnnotations.map(
                    ({_key, _type, ...value}) => ({
                      name: _type,
                      value,
                    }),
                  ),
                }),
                raise({type: 'insert.break'}),
              ]
            : [
                raise({
                  type: 'insert.span',
                  text: textRun,
                  decorators: activeDecorators,
                  annotations: activeAnnotations.map(
                    ({_key, _type, ...value}) => ({
                      name: _type,
                      value,
                    }),
                  ),
                }),
              ],
        ),
    ],
  }),
  defineBehavior({
    on: 'deserialization.success',
    actions: [
      ({event}) => [
        raise({
          type: 'insert.blocks',
          blocks: event.data,
          placement: 'auto',
        }),
      ],
    ],
  }),
  defineBehavior({
    on: 'deserialization.failure',
    guard: ({event}) => {
      if (event.mimeType === '*/*') {
        return false
      }

      const availableData = getFirstAvailableData({
        dataTransfer: event.originEvent.originEvent.dataTransfer,
        startAfter: event.mimeType,
      })

      if (!availableData) {
        return false
      }

      return {
        type: 'deserialize.data' as const,
        mimeType: availableData.mimeType,
        data: availableData.data,
        originEvent: event.originEvent,
      }
    },
    actions: [(_, deserializeDataEvent) => [raise(deserializeDataEvent)]],
  }),
  defineBehavior({
    on: 'deserialization.failure',
    actions: [
      ({event}) => [
        {
          type: 'effect',
          effect: () => {
            console.warn(
              `Deserialization of ${event.mimeType} failed with reason "${event.reason}"`,
            )
          },
        },
      ],
    ],
  }),
]

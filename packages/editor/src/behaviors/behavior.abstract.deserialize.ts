import {isTextBlock} from '@portabletext/schema'
import * as selectors from '../selectors'
import {getActiveDecorators} from '../selectors/selector.get-active-decorators'
import {getTextBlockText} from '../utils/util.get-text-block-text'
import {raise} from './behavior.types.action'
import {defineBehavior} from './behavior.types.behavior'

export const abstractDeserializeBehaviors = [
  defineBehavior({
    on: 'deserialize',
    guard: ({event}) => {
      const portableText = event.originEvent.originEvent.dataTransfer.getData(
        'application/x-portable-text',
      )

      if (portableText) {
        return {
          type: 'deserialize.data',
          mimeType: 'application/x-portable-text',
          data: portableText,
          originEvent: event.originEvent,
        } as const
      }

      const json =
        event.originEvent.originEvent.dataTransfer.getData('application/json')

      if (json) {
        return {
          type: 'deserialize.data',
          mimeType: 'application/json',
          data: json,
          originEvent: event.originEvent,
        } as const
      }

      const html =
        event.originEvent.originEvent.dataTransfer.getData('text/html')

      if (html) {
        return {
          type: 'deserialize.data',
          mimeType: 'text/html',
          data: html,
          originEvent: event.originEvent,
        } as const
      }

      const text =
        event.originEvent.originEvent.dataTransfer.getData('text/plain')

      if (text) {
        return {
          type: 'deserialize.data',
          mimeType: 'text/plain',
          data: text,
          originEvent: event.originEvent,
        } as const
      }

      return false
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
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (
        focusTextBlock &&
        event.mimeType === 'text/plain' &&
        event.originEvent.type === 'clipboard.paste'
      ) {
        const activeDecorators = getActiveDecorators(snapshot)
        const activeAnnotations = selectors.getActiveAnnotations(snapshot)

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
      if (event.mimeType === 'application/x-portable-text') {
        const json =
          event.originEvent.originEvent.dataTransfer.getData('application/json')

        if (json) {
          return {
            type: 'deserialize.data',
            mimeType: 'application/json',
            data: json,
            originEvent: event.originEvent,
          } as const
        }
      }

      if (event.mimeType === 'application/json') {
        const html =
          event.originEvent.originEvent.dataTransfer.getData('text/html')

        if (html) {
          return {
            type: 'deserialize.data',
            mimeType: 'text/html',
            data: html,
            originEvent: event.originEvent,
          } as const
        }
      }

      if (event.mimeType === 'text/html') {
        const text =
          event.originEvent.originEvent.dataTransfer.getData('text/plain')

        if (text) {
          return {
            type: 'deserialize.data',
            mimeType: 'text/plain',
            data: text,
            originEvent: event.originEvent,
          } as const
        }
      }

      return false
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

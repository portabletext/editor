import type {EditorSchema} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {defineInputRule} from './input-rule'

export function createStockTickerRule(config: {
  stockTickerObject: (context: {
    schema: EditorSchema
    symbol: string
  }) => {name: string; value?: {[prop: string]: unknown}} | undefined
}) {
  return defineInputRule({
    on: /\{(.+)\}/,
    guard: ({snapshot, event}) => {
      const match = event.matches.at(0)

      if (!match) {
        return false
      }

      const symbolMatch = match.groupMatches.at(0)

      if (symbolMatch === undefined) {
        return false
      }

      const stockTickerObject = config.stockTickerObject({
        schema: snapshot.context.schema,
        symbol: symbolMatch.text,
      })

      if (!stockTickerObject) {
        return false
      }

      return {match, stockTickerObject}
    },
    actions: [
      ({snapshot, event}, {match, stockTickerObject}) => {
        const stockTickerKey = snapshot.context.keyGenerator()

        return [
          raise({
            type: 'delete',
            at: match.targetOffsets,
          }),
          raise({
            type: 'insert.child',
            child: {
              ...stockTickerObject.value,
              _key: stockTickerKey,
              _type: stockTickerObject.name,
            },
          }),
          raise({
            type: 'select',
            at: {
              anchor: {
                path: [
                  {_key: event.focusTextBlock.node._key},
                  'children',
                  {_key: stockTickerKey},
                ],
                offset: 0,
              },
              focus: {
                path: [
                  {_key: event.focusTextBlock.node._key},
                  'children',
                  {_key: stockTickerKey},
                ],
                offset: 0,
              },
            },
          }),
        ]
      },
    ],
  })
}

import {useEditor} from '@portabletext/editor'
import {defineBehavior, execute} from '@portabletext/editor/behaviors'
import {
  getBlockTextBefore,
  getFocusTextBlock,
  getSelectionStartPoint,
} from '@portabletext/editor/selectors'
import {spanSelectionPointToBlockOffset} from '@portabletext/editor/utils'
import {useEffect} from 'react'
import {createPairRegex} from './get-text-to-emphasize'

const singleQuotePairRegex = new RegExp(`${createPairRegex("'", 1)}$`)
const doubleQuotePairRegex = new RegExp(`${createPairRegex('"', 1)}$`)

const smartQuotesBehaviors = [
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const focusTextBlock = getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const textBefore = getBlockTextBefore(snapshot)
      const newText = textBefore + event.text
      const textToSmartSingleQuote = newText.match(singleQuotePairRegex)?.at(0)
      const textToSmartDoubleQuote = newText.match(doubleQuotePairRegex)?.at(0)

      const textToSmartQuote = textToSmartSingleQuote ?? textToSmartDoubleQuote
      const smartStartQuote = textToSmartSingleQuote ? '‘' : '“'
      const smartEndQuote = textToSmartSingleQuote ? '’' : '”'

      if (!textToSmartQuote) {
        return false
      }

      const selectionStartPoint = getSelectionStartPoint(snapshot)
      const selectionStartOffset = selectionStartPoint
        ? spanSelectionPointToBlockOffset({
            context: snapshot.context,
            selectionPoint: selectionStartPoint,
          })
        : undefined

      if (!selectionStartOffset) {
        return false
      }

      const startQuoteOffsets = {
        anchor: {
          path: focusTextBlock.path,
          offset: newText.length - textToSmartQuote.length,
        },
        focus: {
          path: focusTextBlock.path,
          offset: newText.length - textToSmartQuote.length + 1,
        },
      }

      const endQuoteOffsets = {
        anchor: {
          path: focusTextBlock.path,
          offset: selectionStartOffset.offset + event.text.length - 1,
        },
        focus: {
          path: focusTextBlock.path,
          offset: selectionStartOffset.offset + event.text.length,
        },
      }

      return {
        startQuoteOffsets,
        endQuoteOffsets,
        smartStartQuote,
        smartEndQuote,
      }
    },
    actions: [
      ({event}) => [execute(event)],
      (
        _,
        {startQuoteOffsets, endQuoteOffsets, smartStartQuote, smartEndQuote},
      ) => [
        execute({
          type: 'select',
          at: startQuoteOffsets,
        }),
        execute({
          type: 'insert.text',
          text: smartStartQuote,
        }),
        execute({
          type: 'select',
          at: endQuoteOffsets,
        }),
        execute({
          type: 'insert.text',
          text: smartEndQuote,
        }),
      ],
    ],
  }),
]

/**
 * @beta
 */
export function SmartQuotesPlugin() {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = smartQuotesBehaviors.map((behavior) =>
      editor.registerBehavior({
        behavior,
      }),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor])

  return null
}

import {useEffect} from 'react'
import {defineBehavior, execute} from '../behaviors'
import {useEditor} from '../editor/use-editor'
import {createPairRegex} from '../internal-utils/get-text-to-emphasize'
import * as selectors from '../selectors'
import * as utils from '../utils'

const singleQuotePairRegex = new RegExp(`${createPairRegex("'", 1)}$`)
const doubleQuotePairRegex = new RegExp(`${createPairRegex('"', 1)}$`)

const smartQuotesBehaviors = [
  defineBehavior({
    on: 'insert.text',
    guard: ({snapshot, event}) => {
      const focusTextBlock = selectors.getFocusTextBlock(snapshot)

      if (!focusTextBlock) {
        return false
      }

      const textBefore = selectors.getBlockTextBefore(snapshot)
      const newText = textBefore + event.text
      const textToSmartSingleQuote = newText.match(singleQuotePairRegex)?.at(0)
      const textToSmartDoubleQuote = newText.match(doubleQuotePairRegex)?.at(0)

      const textToSmartQuote = textToSmartSingleQuote ?? textToSmartDoubleQuote
      const smartStartQuote = textToSmartSingleQuote ? '‘' : '“'
      const smartEndQuote = textToSmartSingleQuote ? '’' : '”'

      if (!textToSmartQuote) {
        return false
      }

      const selectionStartPoint = selectors.getSelectionStartPoint(snapshot)
      const selectionStartOffset = selectionStartPoint
        ? utils.spanSelectionPointToBlockOffset({
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

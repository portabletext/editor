import {useEditor} from '@portabletext/editor'
import {defineBehavior, forward, raise} from '@portabletext/editor/behaviors'
import {
  getBlockTextBefore,
  getFocusTextBlock,
} from '@portabletext/editor/selectors'
import {useEffect} from 'react'

type TextTransformRule = {
  matcher: RegExp
  transform: () => string
}

export const emDashRule: TextTransformRule = {
  matcher: /--/g,
  transform: () => '—',
}

function createTextTransformBehaviors(config: TextTransformRule) {
  return [
    defineBehavior({
      on: 'insert.text',
      guard: ({snapshot, event}) => {
        const focusTextBlock = getFocusTextBlock(snapshot)

        if (!focusTextBlock) {
          return false
        }

        const textBefore = getBlockTextBefore(snapshot)
        const newText = textBefore + event.text

        const previousMatches = [...textBefore.matchAll(config.matcher)].map(
          (match) => ({
            index: match.index,
            length: match?.at(0)?.length,
          }),
        )
        const matches = [...newText.matchAll(config.matcher)].map((match) => ({
          index: match.index,
          length: match?.at(0)?.length,
        }))
        const newMatches = matches.filter(
          (match) =>
            !previousMatches.some(
              (previousMatch) => previousMatch.index === match.index,
            ),
        )

        if (newMatches.length === 0) {
          return false
        }

        const offsetPairs = newMatches
          .flatMap((match) =>
            match.length !== undefined
              ? [
                  {
                    anchor: {
                      path: focusTextBlock.path,
                      offset: match.index,
                    },
                    focus: {
                      path: focusTextBlock.path,
                      offset: match.index + (match.length ?? 0),
                    },
                  },
                ]
              : [],
          )
          .reverse()

        if (offsetPairs.length === 0) {
          return false
        }

        return {
          offsetPairs,
        }
      },
      actions: [
        ({event}) => [forward(event)],
        (_, {offsetPairs}) =>
          offsetPairs.flatMap((offsetPair) => [
            raise({type: 'select', at: offsetPair}),
            raise({type: 'insert.text', text: config.transform()}),
          ]),
      ],
    }),
  ]
}

export function TextTransformationPlugin(props: {config: TextTransformRule}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = createTextTransformBehaviors(props.config).map(
      (behavior) => editor.registerBehavior({behavior}),
    )

    return () => {
      for (const unregisterBehavior of unregisterBehaviors) {
        unregisterBehavior()
      }
    }
  }, [editor, props.config])

  return null
}

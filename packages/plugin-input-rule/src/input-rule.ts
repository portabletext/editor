import type {
  BlockPath,
  EditorSnapshot,
  PortableTextTextBlock,
} from '@portabletext/editor'
import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {getMarkState} from '@portabletext/editor/selectors'

/**
 * @beta
 */
export type InputRule = {
  matcher: RegExp
  transform: ({
    snapshot,
    event,
    textBefore,
    matches,
    focusTextBlock,
  }: {
    snapshot: EditorSnapshot
    event: {type: 'insert.text'; text: string}
    textBefore: string
    focusTextBlock: {
      path: BlockPath
      node: PortableTextTextBlock
    }
    matches: Array<{
      selection: {
        anchor: {
          path: BlockPath
          offset: number
        }
        focus: {
          path: BlockPath
          offset: number
        }
        backward: boolean
      }
    }>
  }) => {
    actions: Array<BehaviorAction>
  }
}

/**
 * @beta
 */
export function defineInputRule(config: InputRule): InputRule {
  return {
    matcher: config.matcher,
    transform: config.transform,
  }
}

type TextTransformRule = {
  matcher: RegExp
  transform: () => string
}

export function defineTextTransformRule(config: TextTransformRule): InputRule {
  return {
    matcher: config.matcher,
    transform: ({snapshot, event, matches, focusTextBlock, textBefore}) => {
      const textLengthDelta = matches.reduce(
        (length, match) =>
          length -
          (config.transform().length -
            (match.selection.focus.offset - match.selection.anchor.offset)),
        0,
      )

      const newText = textBefore + event.text
      const endCaretPosition = {
        path: focusTextBlock.path,
        offset: newText.length - textLengthDelta,
      }

      const actions = matches.reverse().flatMap((match) => [
        raise({type: 'select', at: match.selection}),
        raise({type: 'delete', at: match.selection}),
        raise({
          type: 'insert.child',
          child: {
            _type: snapshot.context.schema.span.name,
            text: config.transform(),
            marks:
              getMarkState({
                ...snapshot,
                context: {
                  ...snapshot.context,
                  selection: {
                    anchor: match.selection.anchor,
                    focus: {
                      path: match.selection.focus.path,
                      offset: Math.min(
                        match.selection.focus.offset,
                        textBefore.length,
                      ),
                    },
                  },
                },
              })?.marks ?? [],
          },
        }),
      ])

      return {
        actions: [
          ...actions,
          raise({
            type: 'select',
            at: {
              anchor: endCaretPosition,
              focus: endCaretPosition,
            },
          }),
        ],
      }
    },
  }
}

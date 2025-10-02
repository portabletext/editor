import type {
  BlockOffset,
  BlockPath,
  EditorSelection,
  EditorSnapshot,
  PortableTextTextBlock,
} from '@portabletext/editor'
import {raise, type BehaviorAction} from '@portabletext/editor/behaviors'
import {getMarkState} from '@portabletext/editor/selectors'

type InputRuleMatchLocation = {
  /**
   * Estimated selection of where in the original text the match is located.
   * The selection is estimated since the match is found in the text after
   * insertion.
   */
  selection: NonNullable<EditorSelection>
  /**
   * Block offsets of the match in the text after the insertion
   */
  targetOffsets: {
    anchor: BlockOffset
    focus: BlockOffset
    backward: boolean
  }
}

/**
 * Match found in the text after the insertion
 */
export type InputRuleMatch = InputRuleMatchLocation & {
  groupMatches: Array<InputRuleMatchLocation>
}

export type InputRuleEvent = {
  type: 'custom.input rule'
  /**
   * Matches found by the input rule
   */
  matches: Array<InputRuleMatch>
  /**
   * The text before the insertion
   */
  textBefore: string
  /**
   * The text is destined to be inserted
   */
  textInserted: string
  /**
   * The text block where the insertion takes place
   */
  focusTextBlock: {
    path: BlockPath
    node: PortableTextTextBlock
  }
}

/**
 * @beta
 */
export type InputRule = {
  matcher: RegExp
  transform: ({
    snapshot,
    event,
  }: {
    snapshot: EditorSnapshot
    event: InputRuleEvent
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
    transform: ({snapshot, event}) => {
      const matches = event.matches.flatMap((match) =>
        match.groupMatches.length === 0 ? [match] : match.groupMatches,
      )
      const textLengthDelta = matches.reduce((length, match) => {
        return (
          length -
          (config.transform().length -
            (match.targetOffsets.focus.offset -
              match.targetOffsets.anchor.offset))
        )
      }, 0)

      const newText = event.textBefore + event.textInserted
      const endCaretPosition = {
        path: event.focusTextBlock.path,
        offset: newText.length - textLengthDelta,
      }

      const actions = matches.reverse().flatMap((match) => [
        raise({type: 'select', at: match.targetOffsets}),
        raise({type: 'delete', at: match.targetOffsets}),
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
                        event.textBefore.length,
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

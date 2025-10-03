import type {
  BlockOffset,
  BlockPath,
  EditorSelection,
  PortableTextTextBlock,
} from '@portabletext/editor'
import type {
  BehaviorActionSet,
  BehaviorGuard,
} from '@portabletext/editor/behaviors'

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
 * @beta
 */
export type InputRuleMatch = InputRuleMatchLocation & {
  groupMatches: Array<InputRuleMatchLocation>
}

/**
 * @beta
 */
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
export type InputRuleGuard = BehaviorGuard<InputRuleEvent, boolean>

/**
 * @beta
 */
export type InputRule = {
  matcher: RegExp
  guard?: InputRuleGuard
  actions: Array<BehaviorActionSet<InputRuleEvent, boolean>>
}

/**
 * @beta
 */
export function defineInputRule(config: InputRule): InputRule {
  return config
}

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
 * @public
 */
export type InputRuleMatch = InputRuleMatchLocation & {
  groupMatches: Array<InputRuleMatchLocation>
}

/**
 * @public
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
 * @public
 */
export type InputRuleGuard = BehaviorGuard<InputRuleEvent, boolean>

/**
 * @public
 */
export type InputRule = {
  on: RegExp
  guard?: InputRuleGuard
  actions: Array<BehaviorActionSet<InputRuleEvent, boolean>>
}

/**
 * @public
 */
export function defineInputRule(config: InputRule): InputRule {
  return config
}

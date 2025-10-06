import type {BlockPath, PortableTextTextBlock} from '@portabletext/editor'
import type {
  BehaviorActionSet,
  BehaviorGuard,
} from '@portabletext/editor/behaviors'
import type {InputRuleMatchLocation} from './input-rule-match-location'

/**
 * Match found in the text after the insertion
 * @alpha
 */
export type InputRuleMatch = InputRuleMatchLocation & {
  groupMatches: Array<InputRuleMatchLocation>
}

/**
 * @alpha
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
 * @alpha
 */
export type InputRuleGuard = BehaviorGuard<InputRuleEvent, boolean>

/**
 * @alpha
 */
export type InputRule = {
  on: RegExp
  guard?: InputRuleGuard
  actions: Array<BehaviorActionSet<InputRuleEvent, boolean>>
}

/**
 * @alpha
 */
export function defineInputRule(config: InputRule): InputRule {
  return config
}

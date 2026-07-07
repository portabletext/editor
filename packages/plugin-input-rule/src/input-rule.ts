import type {BlockPath, PortableTextBlock} from '@portabletext/editor'
import type {
  BehaviorActionSet,
  BehaviorGuard,
} from '@portabletext/editor/behaviors'
import type {InputRuleMatchLocation} from './input-rule-match-location'

/**
 * Match found in the text after the insertion
 * @public
 */
export type InputRuleMatch = InputRuleMatchLocation & {
  /**
   * Locations of the match's named capture groups, keyed by group name.
   * Only groups that participated in the match are present, and a capture
   * group must be named (`(?<name>...)`) for its location to be exposed;
   * unnamed groups remain usable for regex mechanics (alternation) but get
   * no location.
   */
  groups: Record<string, InputRuleMatchLocation | undefined>
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
   * The block where the insertion takes place
   */
  focusBlock: {
    path: BlockPath
    node: PortableTextBlock
  }
}

/**
 * @public
 */
export type InputRuleGuard<TGuardResponse = true> = BehaviorGuard<
  InputRuleEvent,
  TGuardResponse
>

/**
 * @public
 */
export type InputRule<TGuardResponse = true> = {
  on: RegExp
  /**
   * Named capture groups inside which an inline object may sit without
   * dropping the match.
   *
   * Inline objects contribute nothing to the text the RegExp matches
   * against, so a match can span one invisibly. By default any such match
   * is dropped: rules commonly delete the matched range, and deleting
   * across an inline object destroys it. Listing a group allows inline
   * objects within that group's matched span (inclusive of its edges,
   * so an object adjacent to the span does not drop the match); everything
   * else in the match, unlisted groups and the text between groups, stays
   * protected. To allow inline objects anywhere in the match, capture the
   * whole pattern in a named group and list it.
   */
  inlineObjects?: {allow: Array<string>}
  guard?: InputRuleGuard<TGuardResponse>
  actions: Array<BehaviorActionSet<InputRuleEvent, TGuardResponse>>
}

/**
 * @public
 */
export function defineInputRule<TGuardResponse = true>(
  config: InputRule<TGuardResponse>,
): InputRule<TGuardResponse> {
  return config
}

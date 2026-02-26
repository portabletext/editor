import type {Ancestor, Node, Point, Range} from '../../slate'
import type {Key} from './key'

export type Action = {at?: Point | Range; run: () => void}

/**
 * Two weak maps that allow us rebuild a path given a node. They are populated
 * at render time such that after a render occurs we can always backtrack.
 */
export const NODE_TO_INDEX: WeakMap<Node, number> = new WeakMap()
export const NODE_TO_PARENT: WeakMap<Node, Ancestor> = new WeakMap()

/**
 * Weak maps that allow us to go between Slate nodes and DOM nodes. These
 * are used to resolve DOM event-related logic into Slate actions.
 */
export const ELEMENT_TO_NODE: WeakMap<HTMLElement, Node> = new WeakMap()
export const NODE_TO_ELEMENT: WeakMap<Node, HTMLElement> = new WeakMap()
export const NODE_TO_KEY: WeakMap<Node, Key> = new WeakMap()

/**
 * Symbols.
 */

export const PLACEHOLDER_SYMBOL = Symbol('placeholder') as unknown as string
export const MARK_PLACEHOLDER_SYMBOL = Symbol(
  'mark-placeholder',
) as unknown as string

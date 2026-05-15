import {useState} from 'react'
import {
  isElementDecorationsEqual,
  splitDecorationsByChild,
} from '../../dom/utils/range-list'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {DecoratedRange} from '../../interfaces/text'

// Pure stabilization: returns previous when contents are per-index equal, else
// builds a new outer array reusing previous per-index references where
// unchanged. Outer-array identity is preserved when nothing changed; per-index
// identity is preserved at every unchanged index. Both invariants are
// load-bearing for the wrapper `React.memo` equalities on
// `prev.decorations === next.decorations` and the per-index
// `isElementDecorationsEqual` short-circuit downstream.
const stabilizeDecorationsByChild = (
  previous: DecoratedRange[][],
  next: DecoratedRange[][],
): DecoratedRange[][] => {
  if (previous.length !== next.length) {
    return next
  }
  let anyChanged = false
  const result: DecoratedRange[][] = new Array(next.length)
  for (let i = 0; i < next.length; i++) {
    const previousAtIndex = previous[i]
    const nextAtIndex = next[i]!
    if (
      previousAtIndex &&
      isElementDecorationsEqual(previousAtIndex, nextAtIndex)
    ) {
      result[i] = previousAtIndex
    } else {
      result[i] = nextAtIndex
      anyChanged = true
    }
  }
  return anyChanged ? result : previous
}

/**
 * Splits decorations across the children of a node, stabilizing per-index
 * references across renders. When decorations at a given child index are
 * unchanged, the previous-render reference is reused so the wrapper
 * `React.memo` short-circuits on `prev.decorations === next.decorations`.
 * When all indices are unchanged, the outer array reference is reused too.
 *
 * The previous-render result is held in state. State is allowed to be read
 * during render, which lets react-compiler reason about the function. When
 * the new content differs from the stored value we return the new array and
 * schedule a state update via render-phase `setState` (a documented React
 * pattern; the render is restarted internally before commit so children
 * never see the intermediate value).
 */
export const useDecorationsByChild = (
  editor: Editor,
  node: Editor | Node,
  path: Path,
  decorations: DecoratedRange[],
): DecoratedRange[][] => {
  const decorationsByChild = splitDecorationsByChild(
    editor,
    node,
    path,
    decorations,
  )
  const [stable, setStable] = useState<DecoratedRange[][]>(decorationsByChild)
  const next = stabilizeDecorationsByChild(stable, decorationsByChild)
  if (next !== stable) {
    setStable(next)
  }
  return next
}

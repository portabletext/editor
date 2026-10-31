/**
 * Whether a delete input type removes the selection to replace it (cut, drag
 * and IME composition) rather than being a Backspace or Delete press. Over a
 * selection these raise a `delete` without a direction, like other
 * replacements.
 */
export function isReplacementDelete(inputType: string): boolean {
  return (
    inputType === 'deleteByCut' ||
    inputType === 'deleteByDrag' ||
    inputType === 'deleteByComposition'
  )
}

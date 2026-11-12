import type {CorrectionEntry, StructuralCorrection} from './types'

export function repairNonObject(
  entry: CorrectionEntry,
): StructuralCorrection | undefined {
  if (
    entry.node !== null &&
    typeof entry.node === 'object' &&
    !Array.isArray(entry.node)
  ) {
    return undefined
  }

  return {
    type: 'non-object',
    patches: [{type: 'unset', path: entry.path}],
  }
}

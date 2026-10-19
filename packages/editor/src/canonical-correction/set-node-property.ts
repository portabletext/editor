import type {Path} from '../types/paths'
import type {CanonicalCorrection, CanonicalRule} from './types'

export function setNodePropertyCorrection(
  rule: CanonicalRule,
  path: Path,
  property: string,
  value: unknown,
): CanonicalCorrection {
  return {rule, type: 'set', path: [...path, property], value}
}

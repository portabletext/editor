import type {Path} from '../types/paths'
import type {CanonicalCorrection, CanonicalRule} from './types'

export function setNodePropertyCorrection(
  rule: CanonicalRule,
  node: object,
  path: Path,
  property: string,
  value: unknown,
): CanonicalCorrection {
  const nodeRecord = node as Record<string, unknown>
  const propertyPath = [...path, property]

  return {
    rule,
    type: 'set',
    path: propertyPath,
    value,
    inverse: nodeRecord.hasOwnProperty(property)
      ? {type: 'set', path: propertyPath, value: nodeRecord[property]}
      : {type: 'unset', path: propertyPath},
  }
}

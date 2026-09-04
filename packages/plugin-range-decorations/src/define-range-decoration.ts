import type {RegistrableRangeDecoration} from '@portabletext/editor'

/**
 * Identity function today; the construction grammar and versioning seam
 * for `RegistrableRangeDecoration`.
 * @beta
 */
export function defineRangeDecoration(
  decoration: RegistrableRangeDecoration,
): RegistrableRangeDecoration {
  return decoration
}

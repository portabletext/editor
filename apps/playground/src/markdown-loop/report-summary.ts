import type {PortableTextBlock} from '@portabletext/editor'
import type {ReconciliationReport} from '@portabletext/markdown'
import {walkKeys} from './key-delta'

type PerformedReconciliationReport = Extract<
  ReconciliationReport,
  {keyMatching: 'performed'}
>

export type PreservedKeyBasis =
  PerformedReconciliationReport['preservedKeys'][number]['basis']
export type InterestingPreservedKeyBasis = Exclude<
  PreservedKeyBasis,
  'content-unchanged'
>

const INTERESTING_BASES: ReadonlyArray<InterestingPreservedKeyBasis> = [
  'content-moved',
  'content-split',
  'content-merged',
  'same-position',
  'similar-content',
]

export type RefusalBadge =
  | 'round-trip-mismatch'
  | 'document-too-large'
  | 'ambiguous-region-too-large'
  | 'annotation-key-conflict'

export type ReportSummary = {
  freshKeys: ReadonlySet<string>
  freshCount: number
  adoptedCount: number
  basisCounts: ReadonlyArray<{
    basis: InterestingPreservedKeyBasis
    count: number
  }>
  basisByKey: ReadonlyMap<string, PreservedKeyBasis>
  renamedKeysCount: number
  refusalReasons: ReadonlyArray<RefusalBadge>
  skippedReason: 'round-trip-mismatch' | 'document-too-large' | null
}

/**
 * A key is fresh by absence from the evidence, not by membership in
 * some computed set: every key reachable in `value` that the report
 * did not list as preserved is fresh, the same rule `applyMarkdownEdit`
 * follows when it mints one. A skipped report preserved nothing, so
 * every key is fresh except the `renamedKeys` targets: a
 * `json:object` payload key carried through the markdown verbatim
 * still gets renamed to stay unique even though nothing else adopted.
 */
export function summarizeReport(
  report: ReconciliationReport,
  value: ReadonlyArray<PortableTextBlock>,
): ReportSummary {
  if (report.keyMatching === 'skipped') {
    const renamedTargets = new Set(
      report.renamedKeys.map((renamed) => renamed.key),
    )
    const freshKeys = new Set<string>()
    walkKeys(value, (key) => {
      if (!renamedTargets.has(key)) {
        freshKeys.add(key)
      }
    })
    return {
      freshKeys,
      freshCount: freshKeys.size,
      adoptedCount: 0,
      basisCounts: [],
      basisByKey: new Map(),
      renamedKeysCount: report.renamedKeys.length,
      refusalReasons: [report.reason],
      skippedReason: report.reason,
    }
  }

  const basisByKey = new Map<string, PreservedKeyBasis>()
  for (const preserved of report.preservedKeys) {
    basisByKey.set(preserved.key, preserved.basis)
  }

  const freshKeys = new Set<string>()
  walkKeys(value, (key) => {
    if (!basisByKey.has(key)) {
      freshKeys.add(key)
    }
  })

  const countByBasis = new Map<InterestingPreservedKeyBasis, number>()
  for (const preserved of report.preservedKeys) {
    if (preserved.basis === 'content-unchanged') {
      continue
    }
    countByBasis.set(
      preserved.basis,
      (countByBasis.get(preserved.basis) ?? 0) + 1,
    )
  }
  const basisCounts = INTERESTING_BASES.map((basis) => ({
    basis,
    count: countByBasis.get(basis) ?? 0,
  })).filter((entry) => entry.count > 0)

  return {
    freshKeys,
    freshCount: freshKeys.size,
    adoptedCount: report.preservedKeys.length,
    basisCounts,
    basisByKey,
    renamedKeysCount: report.renamedKeys.length,
    refusalReasons: [
      ...new Set(report.keyFallbacks.map((fallback) => fallback.type)),
    ],
    skippedReason: null,
  }
}

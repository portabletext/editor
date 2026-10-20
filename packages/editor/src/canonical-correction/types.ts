import type {Schema} from '@portabletext/schema'
import type {CorrectionEntry} from '../caret-correction/correction-entry'
import type {Path} from '../types/paths'

export type CanonicalCorrection =
  | {
      rule: CanonicalRule
      type: 'set'
      path: Path
      value: unknown
    }
  | {rule: CanonicalRule; type: 'unset'; path: Path}
  | {rule: CanonicalRule; type: 'merge'; path: Path; position: number}

export type CanonicalRule =
  | 'merge-spans-same-marks'
  | 'missing-mark-definitions'
  | 'missing-style'
  | 'missing-marks'
  | 'empty-span-annotations'
  | 'duplicate-mark-definitions'
  | 'unused-mark-definitions'
  | 'adjacent-spans'

export type CanonicalEntry = CorrectionEntry & {
  defaultStyle: () => string | undefined
}

export type CanonicalContext = {
  schema: Schema
}

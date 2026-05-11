/**
 * Registry of Racetrack garage entries. Add new plugins by importing
 * their entry module and appending to the array.
 */

import {inputRuleEdgeCasesEntry} from './input-rule-edge-cases/entry'
import {mentionPickerEntry} from './mention-picker/entry'
import type {GarageEntry} from './types'

export const garage: Array<GarageEntry> = [
  mentionPickerEntry,
  inputRuleEdgeCasesEntry,
]

export type {GarageEntry} from './types'

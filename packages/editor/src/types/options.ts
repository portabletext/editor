import type {BaseSyntheticEvent} from 'react'
import type {PortableTextEditor} from '../editor/PortableTextEditor'

/**
 * @beta
 */
export type HotkeyOptions = {
  marks?: Record<string, string>
  custom?: Record<
    string,
    (event: BaseSyntheticEvent, editor: PortableTextEditor) => void
  >
}

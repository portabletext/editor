import type {BaseSyntheticEvent} from 'react'
import type {PortableTextEditor} from '../editor/PortableTextEditor'

/**
 * @beta
 * @deprecated The `hotkeys` prop is deprecated. Register `keyboard.keydown` Behaviors instead.
 */
export type HotkeyOptions = {
  marks?: Record<string, string>
  custom?: Record<
    string,
    (event: BaseSyntheticEvent, editor: PortableTextEditor) => void
  >
}

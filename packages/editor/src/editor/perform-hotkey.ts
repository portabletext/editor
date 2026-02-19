import type {KeyboardEvent} from 'react'
import {isHotkey} from '../internal-utils/is-hotkey'
import type {Editor} from '../slate'
import type {HotkeyOptions} from '../types/options'
import type {EditorActor} from './editor-machine'
import type {PortableTextEditor} from './PortableTextEditor'

const reservedHotkeys = ['enter', 'tab', 'shift', 'delete', 'end']

/**
 * Perform legacy hotkeys. Simple `marks` hotkeys trigger `decorator.toggle`
 * events, while `custom` hotkeys have access to the deprecated
 * `PortableTextEditor` API.
 */
export function performHotkey({
  editorActor,
  editor,
  portableTextEditor,
  hotkeys,
  event,
}: {
  editor: Editor
  editorActor: EditorActor
  event: KeyboardEvent<HTMLDivElement>
  portableTextEditor: PortableTextEditor
  hotkeys: HotkeyOptions
}) {
  if (editorActor.getSnapshot().matches({'edit mode': 'read only'})) {
    return
  }

  Object.keys(hotkeys).forEach((cat) => {
    if (cat === 'marks') {
      for (const hotkey in hotkeys[cat]) {
        if (reservedHotkeys.includes(hotkey)) {
          throw new Error(`The hotkey ${hotkey} is reserved!`)
        }

        if (isHotkey(hotkey, event.nativeEvent)) {
          event.preventDefault()
          const possibleMark = hotkeys[cat]

          if (possibleMark) {
            const mark = possibleMark[hotkey]

            if (mark) {
              editorActor.send({
                type: 'behavior event',
                behaviorEvent: {
                  type: 'decorator.toggle',
                  decorator: mark,
                },
                editor,
              })
            }
          }
        }
      }
    }

    if (cat === 'custom') {
      for (const hotkey in hotkeys[cat]) {
        if (reservedHotkeys.includes(hotkey)) {
          throw new Error(`The hotkey ${hotkey} is reserved!`)
        }

        if (isHotkey(hotkey, event.nativeEvent)) {
          const possibleCommand = hotkeys[cat]

          if (possibleCommand) {
            const command = possibleCommand[hotkey]
            if (command) {
              command(event, portableTextEditor)
            }
          }
        }
      }
    }
  })
}

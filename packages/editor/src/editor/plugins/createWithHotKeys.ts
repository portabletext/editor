import type {KeyboardEvent} from 'react'
import type {ReactEditor} from 'slate-react'
import {debugWithName} from '../../internal-utils/debug'
import {isHotkey} from '../../internal-utils/is-hotkey'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {HotkeyOptions} from '../../types/options'
import type {EditorActor} from '../editor-machine'
import type {PortableTextEditor} from '../PortableTextEditor'

const debug = debugWithName('plugin:withHotKeys')

/**
 * This plugin takes care of all hotkeys in the editor
 *
 */
export function createWithHotkeys(
  editorActor: EditorActor,
  portableTextEditor: PortableTextEditor,
  hotkeysFromOptions?: HotkeyOptions,
): (editor: PortableTextSlateEditor & ReactEditor) => any {
  const reservedHotkeys = ['enter', 'tab', 'shift', 'delete', 'end']
  const activeHotkeys = hotkeysFromOptions ?? {}
  return function withHotKeys(editor: PortableTextSlateEditor & ReactEditor) {
    editor.pteWithHotKeys = (event: KeyboardEvent<HTMLDivElement>): void => {
      // Wire up custom marks hotkeys
      Object.keys(activeHotkeys).forEach((cat) => {
        if (cat === 'marks') {
          for (const hotkey in activeHotkeys[cat]) {
            if (reservedHotkeys.includes(hotkey)) {
              throw new Error(`The hotkey ${hotkey} is reserved!`)
            }
            if (isHotkey(hotkey, event.nativeEvent)) {
              event.preventDefault()
              const possibleMark = activeHotkeys[cat]
              if (possibleMark) {
                const mark = possibleMark[hotkey]
                debug(`HotKey ${hotkey} to toggle ${mark}`)
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
        if (cat === 'custom') {
          for (const hotkey in activeHotkeys[cat]) {
            if (reservedHotkeys.includes(hotkey)) {
              throw new Error(`The hotkey ${hotkey} is reserved!`)
            }
            if (isHotkey(hotkey, event.nativeEvent)) {
              const possibleCommand = activeHotkeys[cat]
              if (possibleCommand) {
                const command = possibleCommand[hotkey]
                command(event, portableTextEditor)
              }
            }
          }
        }
      })
    }
    return editor
  }
}

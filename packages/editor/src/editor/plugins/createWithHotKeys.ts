import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import type {KeyboardEvent} from 'react'
import {Editor, Node, Range} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {PortableTextSlateEditor} from '../../types/editor'
import type {HotkeyOptions} from '../../types/options'
import type {SlateTextBlock, VoidElement} from '../../types/slate'
import {debugWithName} from '../../utils/debug'
import {isHotkey} from '../../utils/is-hotkey'
import type {EditorActor} from '../editor-machine'
import type {PortableTextEditor} from '../PortableTextEditor'

const debug = debugWithName('plugin:withHotKeys')

const DEFAULT_HOTKEYS: HotkeyOptions = {
  marks: {
    'mod+b': 'strong',
    'mod+i': 'em',
    'mod+u': 'underline',
    "mod+'": 'code',
  },
  custom: {},
}

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
  const activeHotkeys = hotkeysFromOptions || DEFAULT_HOTKEYS // TODO: Merge where possible? A union?
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

      const isEnter = isHotkey('enter', event.nativeEvent)
      const isTab = isHotkey('tab', event.nativeEvent)
      const isShiftEnter = isHotkey('shift+enter', event.nativeEvent)
      const isShiftTab = isHotkey('shift+tab', event.nativeEvent)

      // Tab for lists
      // Only steal tab when we are on a plain text span or we are at the start of the line (fallback if the whole block is annotated or contains a single inline object)
      // Otherwise tab is reserved for accessability for buttons etc.
      if ((isTab || isShiftTab) && editor.selection) {
        const [focusChild] = Editor.node(editor, editor.selection.focus, {
          depth: 2,
        })
        const [focusBlock] = isPortableTextSpan(focusChild)
          ? Editor.node(editor, editor.selection.focus, {depth: 1})
          : []
        const hasAnnotationFocus =
          focusChild &&
          isPortableTextTextBlock(focusBlock) &&
          isPortableTextSpan(focusChild) &&
          (focusChild.marks || ([] as string[])).filter((m) =>
            (focusBlock.markDefs || []).map((def) => def._key).includes(m),
          ).length > 0
        const [start] = Range.edges(editor.selection)
        const atStartOfNode = Editor.isStart(editor, start, start.path)

        if (
          focusChild &&
          isPortableTextSpan(focusChild) &&
          (!hasAnnotationFocus || atStartOfNode) &&
          editor.pteIncrementBlockLevels(isShiftTab)
        ) {
          event.preventDefault()
        }
      }

      // Deal with enter key combos
      if (isEnter && !isShiftEnter && editor.selection) {
        const focusBlockPath = editor.selection.focus.path.slice(0, 1)
        const focusBlock = Node.descendant(editor, focusBlockPath) as
          | SlateTextBlock
          | VoidElement

        // List item enter key
        if (editor.isListBlock(focusBlock)) {
          if (editor.pteEndList()) {
            event.preventDefault()
          }
          return
        }
      }
    }
    return editor
  }
}

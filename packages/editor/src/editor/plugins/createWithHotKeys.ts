import {isPortableTextSpan, isPortableTextTextBlock} from '@sanity/types'
import {isHotkey} from 'is-hotkey-esm'
import type {KeyboardEvent} from 'react'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {ReactEditor} from 'slate-react'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import type {HotkeyOptions} from '../../types/options'
import type {SlateTextBlock, VoidElement} from '../../types/slate'
import {debugWithName} from '../../utils/debug'
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
  types: PortableTextMemberSchemaTypes,
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
                editor.pteToggleMark(mark)
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
      const isArrowDown = isHotkey('down', event.nativeEvent)
      const isArrowUp = isHotkey('up', event.nativeEvent)

      // Check if the user is in a void block, in that case, add an empty text block below if there is no next block
      if (isArrowDown && editor.selection) {
        const focusBlock = Node.descendant(
          editor,
          editor.selection.focus.path.slice(0, 1),
        ) as SlateTextBlock | VoidElement

        if (focusBlock && Editor.isVoid(editor, focusBlock)) {
          const nextPath = Path.next(editor.selection.focus.path.slice(0, 1))
          const nextBlock = Node.has(editor, nextPath)
          if (!nextBlock) {
            Transforms.insertNodes(
              editor,
              editor.pteCreateTextBlock({decorators: []}),
              {
                at: nextPath,
              },
            )
            editor.onChange()
            return
          }
        }
      }
      if (isArrowUp && editor.selection) {
        const isFirstBlock = editor.selection.focus.path[0] === 0
        const focusBlock = Node.descendant(
          editor,
          editor.selection.focus.path.slice(0, 1),
        ) as SlateTextBlock | VoidElement

        if (isFirstBlock && focusBlock && Editor.isVoid(editor, focusBlock)) {
          Transforms.insertNodes(
            editor,
            editor.pteCreateTextBlock({decorators: []}),
            {
              at: [0],
            },
          )
          Transforms.select(editor, {path: [0, 0], offset: 0})
          editor.onChange()
          return
        }
      }

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

        // Enter from another style than the first (default one)
        if (
          editor.isTextBlock(focusBlock) &&
          focusBlock.style &&
          focusBlock.style !== types.styles[0].value
        ) {
          const [, end] = Range.edges(editor.selection)
          const endAtEndOfNode = Editor.isEnd(editor, end, end.path)
          if (endAtEndOfNode) {
            Editor.insertNode(
              editor,
              editor.pteCreateTextBlock({decorators: []}),
            )
            event.preventDefault()
            editor.onChange()
            return
          }
        }
        // Block object enter key
        if (focusBlock && Editor.isVoid(editor, focusBlock)) {
          Editor.insertNode(editor, editor.pteCreateTextBlock({decorators: []}))
          event.preventDefault()
          editor.onChange()
          return
        }
        // Default enter key behavior
        event.preventDefault()
        editor.insertBreak()
        editor.onChange()
      }

      // Soft line breaks
      if (isShiftEnter) {
        event.preventDefault()
        editor.insertText('\n')
        return
      }

      // Undo/redo
      if (isHotkey('mod+z', event.nativeEvent)) {
        event.preventDefault()
        editor.undo()
        return
      }
      if (
        isHotkey('mod+y', event.nativeEvent) ||
        isHotkey('mod+shift+z', event.nativeEvent)
      ) {
        event.preventDefault()
        editor.redo()
      }
    }
    return editor
  }
}

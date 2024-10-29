import {Editor, Range, Text, Transforms} from 'slate'
import type {
  PortableTextMemberSchemaTypes,
  PortableTextSlateEditor,
} from '../../types/editor'
import {debugWithName} from '../../utils/debug'
import {toSlateValue} from '../../utils/values'
import type {EditorActor} from '../editor-machine'
import type {PortableTextEditor} from '../PortableTextEditor'

const debug = debugWithName('plugin:withUtils')

interface Options {
  editorActor: EditorActor
  schemaTypes: PortableTextMemberSchemaTypes
  portableTextEditor: PortableTextEditor
}
/**
 * This plugin makes various util commands available in the editor
 *
 */
export function createWithUtils({
  editorActor,
  schemaTypes,
  portableTextEditor,
}: Options) {
  return function withUtils(
    editor: PortableTextSlateEditor,
  ): PortableTextSlateEditor {
    // Expands the the selection to wrap around the word the focus is at
    editor.pteExpandToWord = () => {
      const {selection} = editor
      if (selection && !Range.isExpanded(selection)) {
        const [textNode] = Editor.node(editor, selection.focus, {depth: 2})
        if (!textNode || !Text.isText(textNode) || textNode.text.length === 0) {
          debug(`pteExpandToWord: Can't expand to word here`)
          return
        }
        const {focus} = selection
        const focusOffset = focus.offset
        const charsBefore = textNode.text.slice(0, focusOffset)
        const charsAfter = textNode.text.slice(focusOffset, -1)
        const isEmpty = (str: string) => str.match(/\s/g)
        const whiteSpaceBeforeIndex = charsBefore
          .split('')
          .reverse()
          .findIndex((str) => isEmpty(str))
        const newStartOffset =
          whiteSpaceBeforeIndex > -1
            ? charsBefore.length - whiteSpaceBeforeIndex
            : 0
        const whiteSpaceAfterIndex = charsAfter
          .split('')
          .findIndex((obj) => isEmpty(obj))
        const newEndOffset =
          charsBefore.length +
          (whiteSpaceAfterIndex > -1
            ? whiteSpaceAfterIndex
            : charsAfter.length + 1)
        if (
          !(
            newStartOffset === newEndOffset ||
            Number.isNaN(newStartOffset) ||
            Number.isNaN(newEndOffset)
          )
        ) {
          debug('pteExpandToWord: Expanding to focused word')
          Transforms.setSelection(editor, {
            anchor: {...selection.anchor, offset: newStartOffset},
            focus: {...selection.focus, offset: newEndOffset},
          })
          return
        }
        debug(`pteExpandToWord: Can't expand to word here`)
      }
    }

    editor.pteCreateTextBlock = (options: {
      decorators: Array<string>
      listItem?: string
      level?: number
    }) => {
      const block = toSlateValue(
        [
          {
            _type: schemaTypes.block.name,
            _key: editorActor.getSnapshot().context.keyGenerator(),
            style: schemaTypes.styles[0].value || 'normal',
            ...(options.listItem ? {listItem: options.listItem} : {}),
            ...(options.level ? {level: options.level} : {}),
            markDefs: [],
            children: [
              {
                _type: 'span',
                _key: editorActor.getSnapshot().context.keyGenerator(),
                text: '',
                marks: options.decorators.filter((decorator) =>
                  schemaTypes.decorators.find(({value}) => value === decorator),
                ),
              },
            ],
          },
        ],
        portableTextEditor,
      )[0]
      return block
    }
    return editor
  }
}

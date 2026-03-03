import type {Point} from '../interfaces'
import {Editor, type EditorInterface} from '../interfaces/editor'
import {Element} from '../interfaces/element'
import type {NodeEntry} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'

export const marks: EditorInterface['marks'] = (editor, _options = {}) => {
  const {marks, selection} = editor

  if (!selection) {
    return null
  }
  let {anchor, focus} = selection

  if (marks) {
    return marks
  }

  if (Range.isExpanded(selection)) {
    const isBackward = Range.isBackward(selection)
    if (isBackward) {
      ;[focus, anchor] = [anchor, focus]
    }
    /**
     * COMPAT: Make sure hanging ranges (caused by double clicking in Firefox)
     * do not adversely affect the returned marks.
     */
    const isEnd = Editor.isEnd(editor, anchor, anchor.path)
    if (isEnd) {
      const after = Editor.after(editor, anchor as Point)
      if (after) {
        anchor = after
      }
    }

    const [match] = Editor.nodes(editor, {
      match: (n) => Text.isText(n, editor.schema),
      at: {
        anchor,
        focus,
      },
    })

    if (match) {
      const [node] = match as NodeEntry<Text>
      const {text: _text, ...rest} = node
      return rest
    } else {
      return {} as ReturnType<EditorInterface['marks']> & {}
    }
  }

  const {path} = anchor

  let [node] = Editor.leaf(editor, path)

  if (!Text.isText(node, editor.schema)) {
    return {} as ReturnType<EditorInterface['marks']> & {}
  }

  if (anchor.offset === 0) {
    const prev = Editor.previous(editor, {
      at: path,
      match: (n) => Text.isText(n, editor.schema),
    })
    const block = Editor.above(editor, {
      match: (n) =>
        Element.isElement(n, editor.schema) && Editor.isBlock(editor, n),
    })

    if (prev && block) {
      const [prevNode, prevPath] = prev
      const [, blockPath] = block

      if (Path.isAncestor(blockPath, prevPath)) {
        node = prevNode as Text
      }
    }
  }

  const {text: _text2, ...rest} = node
  return rest
}

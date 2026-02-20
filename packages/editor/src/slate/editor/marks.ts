import type {Point} from '../interfaces'
import {Editor, type EditorInterface} from '../interfaces/editor'
import type {NodeEntry} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import type {Text} from '../interfaces/text'

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
      match: editor.isText,
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

  if (anchor.offset === 0) {
    const prev = Editor.previous(editor, {at: path, match: editor.isText})
    const markedVoid = Editor.above(editor, {
      match: (n) =>
        editor.isElement(n) &&
        Editor.isVoid(editor, n) &&
        editor.markableVoid(n),
    })
    if (!markedVoid) {
      const block = Editor.above(editor, {
        match: (n) => editor.isElement(n) && Editor.isBlock(editor, n),
      })

      if (prev && block) {
        const [prevNode, prevPath] = prev
        const [, blockPath] = block

        if (Path.isAncestor(blockPath, prevPath)) {
          node = prevNode as Text
        }
      }
    }
  }

  const {text: _text2, ...rest} = node
  return rest
}

import {Editor, Node, type Path} from 'slate'
import type {PortableTextSlateEditor} from '../types/editor'

export function getFocusBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  if (!editor.selection) {
    return [undefined, undefined]
  }

  const focusBlock = Array.from(
    Editor.nodes(editor, {
      at: editor.selection.focus.path.slice(0, 1),
      match: (n) => !Editor.isEditor(n),
    }),
  ).at(0)

  return focusBlock ?? [undefined, undefined]
}

export function getFocusChild({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const [focusBlock, focusBlockPath] = getFocusBlock({editor})
  const childIndex = editor.selection?.focus.path.at(1)

  if (!focusBlock || !focusBlockPath || childIndex === undefined) {
    return [undefined, undefined]
  }

  const focusChild = Node.child(focusBlock, childIndex)

  return focusChild
    ? [focusChild, [...focusBlockPath, childIndex]]
    : [undefined, undefined]
}

export function getLastBlock({
  editor,
}: {
  editor: PortableTextSlateEditor
}): [node: Node, path: Path] | [undefined, undefined] {
  const lastBlock = Array.from(
    Editor.nodes(editor, {
      match: (n) => !Editor.isEditor(n),
      at: [],
      reverse: true,
    }),
  ).at(0)

  return lastBlock ?? [undefined, undefined]
}

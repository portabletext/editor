import type {EditorInterface} from '../interfaces/editor'
import {Node} from '../interfaces/node'
import {Path} from '../interfaces/path'
import {Range} from '../interfaces/range'
import {Text} from '../interfaces/text'

export const point: EditorInterface['point'] = (editor, at, options = {}) => {
  const {edge = 'start'} = options

  if (Path.isPath(at)) {
    let path: Path

    if (edge === 'end') {
      const [, lastPath] = Node.last(editor, at)
      path = lastPath
    } else {
      const [, firstPath] = Node.first(editor, at)
      path = firstPath
    }

    const node = Node.get(editor, path)

    if (!Text.isText(node)) {
      throw new Error(
        `Cannot get the ${edge} point in the node at path [${at}] because it has no ${edge} text node.`,
      )
    }

    return {path, offset: edge === 'end' ? node.text.length : 0}
  }

  if (Range.isRange(at)) {
    const [start, end] = Range.edges(at)
    return edge === 'start' ? start : end
  }

  return at
}

import type {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import {pointEquals} from '../point/point-equals'

export function setSelection(editor: Editor, props: Partial<Range>): void {
  const {selection} = editor
  const oldProps: Partial<Range> | null = {}
  const newProps: Partial<Range> = {}

  if (!selection) {
    return
  }

  for (const k in props) {
    if (
      (k === 'anchor' &&
        props.anchor != null &&
        !pointEquals(props.anchor, selection.anchor)) ||
      (k === 'focus' &&
        props.focus != null &&
        !pointEquals(props.focus, selection.focus)) ||
      (k !== 'anchor' &&
        k !== 'focus' &&
        props[k as keyof Range] !== selection[k as keyof Range])
    ) {
      oldProps[k as keyof Range] = selection[k as keyof Range]
      newProps[k as keyof Range] = props[k as keyof Range]
    }
  }

  if (Object.keys(oldProps).length > 0) {
    editor.apply({
      type: 'set_selection',
      properties: oldProps,
      newProperties: newProps,
    })
  }
}

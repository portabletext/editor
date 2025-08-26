import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {EditorSelection, EditorSelectionPoint} from '../types/editor'

export function getEditorSelection(
  context: Pick<EditorContext, 'schema' | 'value'>,
): EditorSelection {
  let anchor: EditorSelectionPoint | undefined
  let focus: EditorSelectionPoint | undefined
  const firstBlock = context.value[0]
  const lastBlock = context.value[context.value.length - 1]

  if (isTextBlock(context, firstBlock)) {
    anchor = {
      path: [
        {_key: firstBlock._key},
        'children',
        {_key: firstBlock.children[0]._key},
      ],
      offset: 0,
    }
  } else {
    anchor = {
      path: [{_key: firstBlock._key}],
      offset: 0,
    }
  }

  const lastChild = isTextBlock(context, lastBlock)
    ? lastBlock.children[lastBlock.children.length - 1]
    : undefined
  if (
    isTextBlock(context, lastBlock) &&
    lastChild &&
    isSpan(context, lastChild)
  ) {
    focus = {
      path: [{_key: lastBlock._key}, 'children', {_key: lastChild._key}],
      offset: lastChild.text.length ?? 0,
    }
  } else {
    focus = {
      path: [{_key: lastBlock._key}],
      offset: 0,
    }
  }

  if (!anchor || !focus) {
    throw new Error('No selection found')
  }

  return {
    anchor,
    focus,
  }
}

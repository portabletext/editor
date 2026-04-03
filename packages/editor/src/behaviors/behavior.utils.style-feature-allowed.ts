import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getFocusTextBlock} from '../selectors/selector.get-focus-text-block'

export function isDecoratorAllowedByStyle(
  snapshot: EditorSnapshot,
  decoratorName: string,
): boolean {
  return isFeatureAllowedByStyle(snapshot, 'decorators', decoratorName)
}

export function isAnnotationAllowedByStyle(
  snapshot: EditorSnapshot,
  annotationName: string,
): boolean {
  return isFeatureAllowedByStyle(snapshot, 'annotations', annotationName)
}

export function isListAllowedByStyle(
  snapshot: EditorSnapshot,
  listName: string,
): boolean {
  return isFeatureAllowedByStyle(snapshot, 'lists', listName)
}

function isFeatureAllowedByStyle(
  snapshot: EditorSnapshot,
  feature: 'decorators' | 'annotations' | 'lists' | 'inlineObjects',
  name: string,
): boolean {
  const focusTextBlock = getFocusTextBlock(snapshot)
  if (!focusTextBlock) {
    return true
  }
  const style = focusTextBlock.node.style
  const styleType = style
    ? snapshot.context.schema.styles.find((s) => s.name === style)
    : undefined
  const allowed = styleType?.[feature]
  if (allowed && !allowed.some((item) => item.name === name)) {
    return false
  }
  return true
}

import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getMarkState} from './selector.get-mark-state'

export function getActiveDecorators(snapshot: EditorSnapshot) {
  const schema = snapshot.context.schema
  const decoratorState = snapshot.decoratorState
  const markState = getMarkState(snapshot)
  const decorators = schema.decorators.map((decorator) => decorator.name)

  const markStateDecorators = (markState?.marks ?? []).filter((mark) =>
    decorators.includes(mark),
  )

  let activeDecorators: Array<string> = markStateDecorators

  for (const decorator in decoratorState) {
    if (decoratorState[decorator] === false) {
      activeDecorators = activeDecorators.filter(
        (activeDecorator) => activeDecorator !== decorator,
      )
    } else if (decoratorState[decorator] === true) {
      if (!activeDecorators.includes(decorator)) {
        activeDecorators.push(decorator)
      }
    }
  }

  const focusBlock = getFocusTextBlock(snapshot)
  if (focusBlock) {
    const style = focusBlock.node.style
    const styleType = style
      ? snapshot.context.schema.styles.find((s) => s.name === style)
      : undefined
    if (styleType?.decorators) {
      const allowedNames = styleType.decorators.map((d) => d.name)
      return activeDecorators.filter((name) => allowedNames.includes(name))
    }
  }

  return activeDecorators
}

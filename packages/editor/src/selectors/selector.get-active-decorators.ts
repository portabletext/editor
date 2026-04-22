import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getMarkState} from './selector.get-mark-state'

export function getActiveDecorators(snapshot: EditorSnapshot) {
  const focusTextBlock = getFocusTextBlock(snapshot)
  const decoratorSchemaTypes = focusTextBlock
    ? getBlockSubSchema(snapshot.context, focusTextBlock.path).decorators
    : snapshot.context.schema.decorators
  const decoratorState = snapshot.decoratorState
  const markState = getMarkState(snapshot)
  const decorators = decoratorSchemaTypes.map((decorator) => decorator.name)

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

  return activeDecorators
}

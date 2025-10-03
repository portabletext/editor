import type {EditorSchema} from '@portabletext/editor'
import {
  getSelectedSpans,
  isActiveDecorator,
} from '@portabletext/editor/selectors'
import type {InputRuleGuard} from '@portabletext/plugin-input-rule'

/**
 * @public
 * Create an `InputRuleGuard` that can prevent the rule from running inside
 * certain decorators.
 *
 * @example
 * ```tsx
 * const guard = createDecoratorGuard({
 *   decorators: ({schema}) => schema.decorators.flatMap((decorator) => decorator.name === 'code' ? [decorator.name] : []),
 * })
 *
 * <TypographyPlugin guard={guard} />
 * ```
 */
export function createDecoratorGuard(config: {
  decorators: ({schema}: {schema: EditorSchema}) => Array<string>
}): InputRuleGuard {
  return ({snapshot, event}) => {
    const decorators = config.decorators({schema: snapshot.context.schema})

    if (decorators.length === 0) {
      return true
    }

    const matchedSpans = event.matches.flatMap((match) =>
      getSelectedSpans({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: match.selection,
        },
      }),
    )

    let preventInputRule = false

    for (const decorator of decorators) {
      if (isActiveDecorator(decorator)(snapshot)) {
        preventInputRule = true
        break
      }

      if (matchedSpans.some((span) => span.node.marks?.includes(decorator))) {
        preventInputRule = true
        break
      }
    }

    return !preventInputRule
  }
}

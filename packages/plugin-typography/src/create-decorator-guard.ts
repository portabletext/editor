import type {EditorContext, EditorSchema} from '@portabletext/editor'
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
 *  decorators: ({context}) => context.schema.decorators.flatMap((decorator) => decorator.name === 'code' ? [] : [decorator.name]),
 * })
 *
 * <TypographyPlugin guard={guard} />
 * ```
 */
export function createDecoratorGuard(config: {
  decorators: ({
    context,
  }: {
    context: Pick<EditorContext, 'schema'>
  }) => Array<EditorSchema['decorators'][number]['name']>
}): InputRuleGuard {
  return ({snapshot, event}) => {
    const allowedDecorators = config.decorators({
      context: {
        schema: snapshot.context.schema,
      },
    })
    const decorators = snapshot.context.schema.decorators.flatMap(
      (decorator) =>
        allowedDecorators.includes(decorator.name) ? [] : [decorator.name],
    )

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

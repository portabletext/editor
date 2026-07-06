import type {EditorContext} from '@portabletext/editor'
import {InputRulePlugin} from '@portabletext/plugin-input-rule'
import {useMemo} from 'react'
import {createCharacterPairRule} from './rule.character-pair'

/**
 * @public
 */
export function CharacterPairDecoratorPlugin(props: {
  decorator: ({
    context,
    schema,
  }: {
    context: Pick<EditorContext, 'schema'>
    /**
     * @deprecated Use `context.schema` instead
     */
    schema: EditorContext['schema']
  }) => string | undefined
  pair: {char: string; amount: number}
}) {
  const rules = useMemo(
    () => [
      createCharacterPairRule({
        decorator: props.decorator,
        pair: props.pair,
      }),
    ],
    [props.decorator, props.pair],
  )

  return <InputRulePlugin rules={rules} />
}

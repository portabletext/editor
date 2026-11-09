import {test} from 'vitest'
import type {CharacterPairDecoratorPlugin} from './plugin.character-pair-decorator'

test('`decorator` takes no deprecated `schema` argument', () => {
  const args = {} as Parameters<
    Parameters<typeof CharacterPairDecoratorPlugin>[0]['decorator']
  >[0]

  // @ts-expect-error `schema` was removed, use `context.schema`
  args.schema
})

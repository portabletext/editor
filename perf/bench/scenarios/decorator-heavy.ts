import {defineSchema} from '@portabletext/editor'
import {mulberry32} from '../stats/rng'
import {buildSentence, createKeyGenerator} from './fixtures'
import type {Scenario} from './types'

const BLOCK_COUNT = 200
const SPANS_PER_BLOCK = 4

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
})

function buildInitialValue() {
  const rng = mulberry32(3)
  const nextKey = createKeyGenerator('deco-')
  return Array.from({length: BLOCK_COUNT}, (_, blockIndex) => {
    const children = Array.from(
      {length: SPANS_PER_BLOCK},
      (_unused, spanIndex) => ({
        _type: 'span',
        _key: nextKey(),
        text: `${buildSentence(rng, 2)} `,
        marks: decoratorForSpan(blockIndex * SPANS_PER_BLOCK + spanIndex),
      }),
    )
    return {
      _type: 'block',
      _key: nextKey(),
      style: 'normal',
      markDefs: [],
      children,
    }
  })
}

/** Every other span carries a decorator, alternating strong/em. */
function decoratorForSpan(overallSpanIndex: number): string[] {
  if (overallSpanIndex % 4 === 1) return ['strong']
  if (overallSpanIndex % 4 === 3) return ['em']
  return []
}

export const decoratorHeavyScenario: Scenario = {
  name: 'decoratorHeavy',
  schemaDefinition,
  initialValue: buildInitialValue(),
  target: {blockIndex: Math.floor(BLOCK_COUNT / 2), position: 'end'},
}

import {defineSchema} from '@portabletext/editor'
import {mulberry32} from '../stats/rng'
import {buildSentence, createKeyGenerator} from './fixtures'
import type {Scenario} from './types'

/** Mirrors the 1,000-block scale used by packages/editor/tests/performance.test.tsx. */
const BLOCK_COUNT = 1000

const schemaDefinition = defineSchema({})

function buildInitialValue() {
  const rng = mulberry32(2)
  const nextKey = createKeyGenerator('huge-')
  return Array.from({length: BLOCK_COUNT}, (_, blockIndex) => ({
    _type: 'block',
    _key: nextKey(),
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: nextKey(),
        text: `block ${blockIndex} ${buildSentence(rng, 3)}`,
        marks: [],
      },
    ],
  }))
}

export const hugeDocScenario: Scenario = {
  name: 'hugeDoc',
  schemaDefinition,
  initialValue: buildInitialValue(),
  target: {blockIndex: Math.floor(BLOCK_COUNT / 2), position: 'end'},
}

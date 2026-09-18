import {defineSchema} from '@portabletext/editor'
import {mulberry32} from '../stats/rng'
import {buildSentence, createKeyGenerator} from './fixtures'
import type {Scenario} from './types'

const schemaDefinition = defineSchema({})

function buildInitialValue() {
  const rng = mulberry32(1)
  const nextKey = createKeyGenerator('plain-')
  return [
    {
      _type: 'block',
      _key: nextKey(),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: nextKey(),
          text: buildSentence(rng, 6),
          marks: [],
        },
      ],
    },
  ]
}

export const plainScenario: Scenario = {
  name: 'plain',
  schemaDefinition,
  initialValue: buildInitialValue(),
  target: {blockIndex: 0, position: 'end'},
}

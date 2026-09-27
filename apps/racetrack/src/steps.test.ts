import {describe, expect, test} from 'vitest'
import {readStepCatalogue} from './steps.ts'

describe(readStepCatalogue.name, () => {
  test('names the kind of block argument every step reads', async () => {
    const catalogue = await readStepCatalogue()

    expect(
      catalogue.steps.filter((step) => step.blockArgument !== null),
    ).toEqual([
      {
        keyword: 'Given',
        pattern: 'the editor state is',
        parameters: [],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'When',
        pattern: 'the selection is',
        parameters: [],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'Given',
        pattern: 'blocks {placement}',
        parameters: ['placement'],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'When',
        pattern: 'a child is inserted',
        parameters: [],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'When',
        pattern:
          'blocks are inserted at {placement} and selected at the {select-position}',
        parameters: ['placement', 'select-position'],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'Then',
        pattern: 'the editor state is',
        parameters: [],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'When',
        pattern: 'x-portable-text is pasted',
        parameters: [],
        blockArgument: 'doc string',
        source: 'editor',
      },
      {
        keyword: 'When',
        pattern: 'data is pasted',
        parameters: [],
        blockArgument: 'data table',
        source: 'editor',
      },
    ])
  })
})

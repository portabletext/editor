import {parameterTypes} from '@portabletext/editor/test'
import {stepDefinitions as editorStepDefinitions} from '@portabletext/editor/test/vitest'
import {createRecorder} from './recorder.ts'
import {
  ownStepDefinitions,
  type RacetrackStepDefinition,
} from './step-definitions.ts'

export type CatalogueStep = {
  keyword: 'Given' | 'When' | 'Then'
  pattern: string
  parameters: Array<string>
  /**
   * What the step reads from under it. `unknown` means the step reads a
   * block argument that `blockArgumentKinds` does not list yet.
   */
  blockArgument: 'doc string' | 'data table' | 'unknown' | null
  source: 'editor' | 'racetrack'
}

export type CatalogueParameterType = {
  name: string
  matchers: Array<string>
}

const keywords = {
  Context: 'Given',
  Action: 'When',
  Outcome: 'Then',
} as const

/**
 * racejar hands a step the doc string or the data table placed under it, but
 * the step's callback only works with the one it was written for.
 */
const blockArgumentKinds: Record<string, 'doc string' | 'data table'> = {
  'the editor state is': 'doc string',
  'the selection is': 'doc string',
  'blocks {placement}': 'doc string',
  'a child is inserted': 'doc string',
  'blocks are inserted at {placement} and selected at the {select-position}':
    'doc string',
  'x-portable-text is pasted': 'doc string',
  'data is pasted': 'data table',
}

export function readCatalogue(): {
  steps: Array<CatalogueStep>
  parameterTypes: Array<CatalogueParameterType>
} {
  return {
    steps: [
      ...editorStepDefinitions.map((definition) =>
        toCatalogueStep(definition, 'editor'),
      ),
      ...ownStepDefinitions(createRecorder()).map((definition) =>
        toCatalogueStep(definition, 'racetrack'),
      ),
    ],
    parameterTypes: parameterTypes.map((parameterType) => ({
      name: parameterType.name ?? '',
      matchers: [...parameterType.regexpStrings],
    })),
  }
}

function toCatalogueStep(
  definition: RacetrackStepDefinition,
  source: CatalogueStep['source'],
): CatalogueStep {
  const parameters = [...definition.text.matchAll(/\{([^}]*)\}/g)].map(
    (match) => match[1] ?? '',
  )
  // racejar passes a doc string or data table as the argument after the
  // placeholders, so a callback declaring one more parameter reads it.
  const readsBlockArgument = definition.callback.length > parameters.length + 1

  return {
    keyword: keywords[definition.type],
    pattern: definition.text,
    parameters,
    blockArgument: readsBlockArgument
      ? (blockArgumentKinds[definition.text] ?? 'unknown')
      : null,
    source,
  }
}

import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {ParameterTypeRegistry} from '@cucumber/cucumber-expressions'
import {runnerImport} from 'vite'
import type {
  CatalogueParameterType,
  CatalogueStep,
} from './harness/catalogue.ts'

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

export type StepCatalogue = {
  steps: Array<CatalogueStep>
  parameterTypes: Array<CatalogueParameterType>
}

/**
 * Evaluates the step definition modules in Node. They import browser-only
 * modules at the top level, so those resolve to stubs here: only the step
 * texts and parameter types are read, no step runs.
 */
export async function readStepCatalogue(): Promise<StepCatalogue> {
  const {module} = await runnerImport<typeof import('./harness/catalogue.ts')>(
    path.join(appDirectory, 'src/harness/catalogue.ts'),
    {
      configFile: false,
      root: appDirectory,
      logLevel: 'silent',
      resolve: {
        tsconfigPaths: true,
        alias: [
          {
            find: /^vitest\/browser$/,
            replacement: path.join(
              appDirectory,
              'src/harness/stubs/vitest-browser.ts',
            ),
          },
          {
            find: /^vitest-browser-react$/,
            replacement: path.join(
              appDirectory,
              'src/harness/stubs/vitest-browser-react.ts',
            ),
          },
        ],
      },
    },
  )
  const catalogue = module.readCatalogue()
  const builtInTypes = new ParameterTypeRegistry()
  const knownTypes = new Map(
    catalogue.parameterTypes.map((parameterType) => [
      parameterType.name,
      parameterType,
    ]),
  )

  const steps = catalogue.steps
  const builtInTypeNames = [
    ...new Set(steps.flatMap((step) => step.parameters)),
  ].filter((name) => !knownTypes.has(name))
  const parameterTypes = [
    ...catalogue.parameterTypes,
    ...builtInTypeNames.map((name) => ({
      name,
      matchers: [...(builtInTypes.lookupByTypeName(name)?.regexpStrings ?? [])],
    })),
  ]

  return {steps, parameterTypes}
}

export function formatStepCatalogue(catalogue: StepCatalogue): string {
  const lines: Array<string> = []

  for (const keyword of ['Given', 'When', 'Then'] as const) {
    lines.push(`${keyword}`)
    for (const step of catalogue.steps) {
      if (step.keyword === keyword) {
        lines.push(
          `  ${step.pattern}${formatBlockArgument(step.blockArgument)}${step.source === 'racetrack' ? '  (racetrack)' : ''}`,
        )
      }
    }
    lines.push('')
  }

  lines.push('Parameter types')
  for (const parameterType of catalogue.parameterTypes) {
    lines.push(
      `  {${parameterType.name}}  ${parameterType.matchers.map((matcher) => `/${matcher}/`).join(' | ')}`,
    )
  }

  return `${lines.join('\n')}\n`
}

function formatBlockArgument(
  blockArgument: CatalogueStep['blockArgument'],
): string {
  switch (blockArgument) {
    case null:
      return ''
    case 'unknown':
      return '  (+ doc string or data table, check the step definition)'
    default:
      return `  (+ ${blockArgument})`
  }
}

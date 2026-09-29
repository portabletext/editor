import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'
import {compileFeature} from 'racejar'
import {parameterTypes} from './parameter-types'
import {stepDefinitions, type Context} from './steps'
import type {World} from './world'

export type CompiledStep = {
  /** The step's keyword as written: `Given`, `When`, `Then`, `And`, `But`. */
  keyword: string
  text: string
  run: (world: World) => void | Promise<void>
}

export type CompiledScenario = {
  name: string
  steps: Array<CompiledStep>
}

export type CompiledScenarios = {
  feature: string
  scenarios: Array<CompiledScenario>
}

/**
 * Compiles a feature file against the package's step definitions, one entry
 * per scenario and per row of a scenario outline. Each step runs on its own
 * against the world it is given, so a caller can run a scenario one step at
 * a time and catch the step that fails.
 */
export function compileScenarios(featureText: string): CompiledScenarios {
  const compiled = compileFeature<Context, Context>({
    featureText,
    stepDefinitions,
    parameterTypes,
  })
  const pickles = parsePickles(featureText)

  if (pickles.scenarios.length !== compiled.scenarios.length) {
    throw new Error(
      `Expected ${compiled.scenarios.length} scenarios in "${compiled.name}", parsed ${pickles.scenarios.length}`,
    )
  }

  return {
    feature: compiled.name,
    scenarios: compiled.scenarios.map((scenario, scenarioIndex) => {
      const parsedSteps = pickles.scenarios[scenarioIndex].steps

      return {
        name: scenario.name,
        steps: scenario.steps.map((runStep, stepIndex) => ({
          keyword: parsedSteps[stepIndex].keyword,
          text: parsedSteps[stepIndex].text,
          run: (world) => runStep({world}),
        })),
      }
    }),
  }
}

function parsePickles(featureText: string): {
  scenarios: Array<{steps: Array<{keyword: string; text: string}>}>
} {
  const newId = Messages.IdGenerator.incrementing()
  const parser = new Gherkin.Parser(
    new Gherkin.AstBuilder(newId),
    new Gherkin.GherkinClassicTokenMatcher(),
  )
  const gherkinDocument = parser.parse(featureText)
  const keywords = new Map<string, string>()

  for (const step of astSteps(gherkinDocument.feature?.children ?? [])) {
    keywords.set(step.id, step.keyword.trim())
  }

  const pickles = Gherkin.compile(gherkinDocument, '', newId)

  return {
    scenarios: pickles.map((pickle) => ({
      steps: pickle.steps.map((step) => ({
        keyword: keywords.get(step.astNodeIds[0] ?? '') ?? '',
        text: step.text,
      })),
    })),
  }
}

function astSteps(
  children: ReadonlyArray<Messages.FeatureChild | Messages.RuleChild>,
): Array<Messages.Step> {
  return children.flatMap((child) => [
    ...(child.background?.steps ?? []),
    ...(child.scenario?.steps ?? []),
    ...('rule' in child && child.rule ? astSteps(child.rule.children) : []),
  ])
}

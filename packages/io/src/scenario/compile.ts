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
  /** Whether the scenario or its feature is tagged `@skip`. */
  skipped: boolean
  /**
   * What the model lacks, from a `# known red:` comment on the line right
   * above the scenario and its tags.
   */
  knownRed: string | undefined
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
      const parsedScenario = pickles.scenarios[scenarioIndex]
      const parsedSteps = parsedScenario.steps

      return {
        name: scenario.name,
        skipped: scenario.tag === 'skip',
        knownRed: parsedScenario.knownRed,
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
  scenarios: Array<{
    knownRed: string | undefined
    steps: Array<{keyword: string; text: string}>
  }>
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

  const knownRedSentences = new Map<string, string>()

  for (const scenario of astScenarios(
    gherkinDocument.feature?.children ?? [],
  )) {
    const firstLine = Math.min(
      scenario.location.line,
      ...scenario.tags.map((tag) => tag.location.line),
    )
    const comment = gherkinDocument.comments.find(
      (candidate) => candidate.location.line === firstLine - 1,
    )
    const knownRed = comment?.text.match(/^\s*#\s*known red:\s*(.+?)\s*$/)

    if (knownRed) {
      knownRedSentences.set(scenario.id, knownRed[1])
    }
  }

  const pickles = Gherkin.compile(gherkinDocument, '', newId)

  return {
    scenarios: pickles.map((pickle) => ({
      knownRed: knownRedSentences.get(pickle.astNodeIds[0] ?? ''),
      steps: pickle.steps.map((step) => ({
        keyword: keywords.get(step.astNodeIds[0] ?? '') ?? '',
        text: step.text,
      })),
    })),
  }
}

function astScenarios(
  children: ReadonlyArray<Messages.FeatureChild | Messages.RuleChild>,
): Array<Messages.Scenario> {
  return children.flatMap((child) => [
    ...(child.scenario ? [child.scenario] : []),
    ...('rule' in child && child.rule ? astScenarios(child.rule.children) : []),
  ])
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

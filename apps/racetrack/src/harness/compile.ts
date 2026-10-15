import type {ParameterType} from '@cucumber/cucumber-expressions'
import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'
import {compileFeature, type CompiledFeature} from 'racejar'
import type {RacetrackStepDefinition} from './step-definitions.ts'

export type StepLabel = {
  text: string
  isAssertion: boolean
}

export function compileRacetrackFeature({
  featureText,
  stepDefinitions,
  parameterTypes,
  captureStepText,
}: {
  featureText: string
  stepDefinitions: Array<RacetrackStepDefinition>
  parameterTypes: Array<ParameterType<unknown>>
  captureStepText: string
}): {feature: CompiledFeature; labels: Array<Array<StepLabel>>} {
  const feature = compileFeature({featureText, stepDefinitions, parameterTypes})
  const taggedScenarios = feature.scenarios.filter(
    (scenario) => scenario.tag !== undefined,
  )

  if (feature.tag !== undefined || taggedScenarios.length > 0) {
    throw new Error(
      `Racetrack does not support @skip or @only. Remove the tag from ${
        feature.tag !== undefined
          ? `the feature "${feature.name}"`
          : taggedScenarios.map((scenario) => `"${scenario.name}"`).join(', ')
      } and put only the scenarios you want to run in the file.`,
    )
  }

  const labels = readStepLabels(featureText, captureStepText)

  if (
    labels.length !== feature.scenarios.length ||
    feature.scenarios.some(
      (scenario, index) => scenario.steps.length !== labels[index]?.length,
    )
  ) {
    throw new Error(
      'Step labels do not line up with the compiled feature. Racetrack and racejar disagree on how the feature compiles.',
    )
  }

  return {feature, labels}
}

/**
 * racejar compiles steps without their text, so the labels come from
 * compiling the same feature with the same Gherkin pipeline and lining the
 * pickles up by position.
 */
function readStepLabels(
  featureText: string,
  captureStepText: string,
): Array<Array<StepLabel>> {
  const newId = Messages.IdGenerator.uuid()
  const parser = new Gherkin.Parser(
    new Gherkin.AstBuilder(newId),
    new Gherkin.GherkinClassicTokenMatcher(),
  )
  const gherkinDocument = parser.parse(featureText)
  const pickles = Gherkin.compile(gherkinDocument, '', newId)

  return pickles.map((pickle) =>
    pickle.steps.map((step) => ({
      text: step.text,
      isAssertion:
        step.type === Messages.PickleStepType.OUTCOME &&
        step.text !== captureStepText,
    })),
  )
}

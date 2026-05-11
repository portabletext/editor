/**
 * Parse a feature file into the expanded list of pickles racejar
 * actually runs. Scenario Outlines are expanded one runtime scenario
 * per Examples row, matching what `compileFeature` produces, so the
 * left-panel scenario count and indices align with the runner's
 * `onStep` events.
 *
 * Uses `@cucumber/gherkin` directly (the same library racejar uses)
 * rather than a hand-rolled parser, so outline-expansion semantics
 * stay in lockstep. `@cucumber/gherkin` is a transitive dependency of
 * racejar, already in the racetrack module tree.
 *
 * Pickle steps drop the original `Given/When/Then/And/But` keyword, so
 * we walk the gherkin AST once to build an id-to-keyword map and look
 * each pickle step's source up by `astNodeIds[0]` for display.
 */

import * as Gherkin from '@cucumber/gherkin'
import * as Messages from '@cucumber/messages'

export type ParsedStep = {
  /** "Given" | "When" | "Then" | "And" | "But" - trimmed of trailing space. */
  keyword: string
  text: string
}

export type ParsedScenario = {
  name: string
  steps: Array<ParsedStep>
}

export type ParsedFeature = {
  name: string
  scenarios: Array<ParsedScenario>
}

function collectStepKeywords(
  document: Messages.GherkinDocument,
): Map<string, string> {
  const keywords = new Map<string, string>()
  const feature = document.feature
  if (!feature) {
    return keywords
  }

  for (const child of feature.children) {
    const stepSources = [
      ...(child.background?.steps ?? []),
      ...(child.scenario?.steps ?? []),
    ]
    for (const step of stepSources) {
      keywords.set(step.id, step.keyword.trim())
    }
    for (const rule of [child.rule].filter(Boolean)) {
      for (const ruleChild of rule!.children) {
        for (const step of [
          ...(ruleChild.background?.steps ?? []),
          ...(ruleChild.scenario?.steps ?? []),
        ]) {
          keywords.set(step.id, step.keyword.trim())
        }
      }
    }
  }
  return keywords
}

export function parseFeature(text: string): ParsedFeature {
  const uuidFn = Messages.IdGenerator.uuid()
  const builder = new Gherkin.AstBuilder(uuidFn)
  const matcher = new Gherkin.GherkinClassicTokenMatcher()
  const parser = new Gherkin.Parser(builder, matcher)

  const document = parser.parse(text)
  const featureName = document.feature?.name ?? ''

  const pickles = Gherkin.compile(
    document,
    featureName.replace(' ', '-'),
    uuidFn,
  )

  const keywordMap = collectStepKeywords(document)

  const scenarios: Array<ParsedScenario> = pickles.map((pickle) => ({
    name: pickle.name,
    steps: pickle.steps.map((step) => ({
      keyword: keywordMap.get(step.astNodeIds[0] ?? '') ?? '',
      text: step.text,
    })),
  }))

  return {name: featureName, scenarios}
}

/**
 * Tiny gherkin parser for the left-panel visual rendering of the
 * `.feature` file. Only handles what the mention-picker feature uses:
 * `Feature:`, `Scenario:`, and `Given`/`When`/`Then`/`And`/`But`
 * steps. Comments (`#`) and blank lines stay attached to whichever
 * scenario follows.
 *
 * The execution path uses racejar's `compileFeature` directly. This
 * parser is only for display.
 */

export type ParsedStep = {
  /** "Given" | "When" | "Then" | "And" | "But" */
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

const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But']

export function parseFeature(text: string): ParsedFeature {
  const lines = text.split(/\r?\n/)
  let featureName = ''
  const scenarios: Array<ParsedScenario> = []
  let current: ParsedScenario | undefined

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.length === 0) {
      continue
    }
    if (line.startsWith('#')) {
      continue
    }

    if (line.startsWith('Feature:')) {
      featureName = line.slice('Feature:'.length).trim()
      continue
    }
    if (line.startsWith('Scenario:')) {
      current = {name: line.slice('Scenario:'.length).trim(), steps: []}
      scenarios.push(current)
      continue
    }
    if (line.startsWith('Scenario Outline:')) {
      current = {
        name: line.slice('Scenario Outline:'.length).trim(),
        steps: [],
      }
      scenarios.push(current)
      continue
    }

    for (const keyword of STEP_KEYWORDS) {
      if (line.startsWith(`${keyword} `)) {
        if (!current) {
          break
        }
        current.steps.push({
          keyword,
          text: line.slice(keyword.length + 1),
        })
        break
      }
    }
  }

  return {name: featureName, scenarios}
}

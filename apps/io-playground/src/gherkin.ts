import {
  compileScenarios,
  type EditorName,
  type World,
} from '@portabletext/io/testing'

export type StepKeyword = 'Given' | 'When' | 'Then'

export type LoggedStep = {keyword: StepKeyword; text: string}

/**
 * Runs one step through the package's step definitions, so what the log
 * records is exactly what ran. The model's steps are synchronous, which lets
 * free play set up a world in one render.
 */
export function runStep(world: World, step: LoggedStep): void {
  const [scenario] = compileScenarios(
    `Feature: Free play\n  Scenario: Free play\n    ${step.keyword} ${step.text}\n`,
  ).scenarios

  for (const compiledStep of scenario?.steps ?? []) {
    if (compiledStep.run(world) instanceof Promise) {
      throw new Error(`"${step.text}" is asynchronous`)
    }
  }
}

/** A step keyword that repeats the one before it is written as `And`. */
export function formatSteps(steps: Array<LoggedStep>): Array<string> {
  return steps.map((step, index) =>
    index > 0 && steps[index - 1].keyword === step.keyword
      ? `And ${step.text}`
      : `${step.keyword} ${step.text}`,
  )
}

export function formatScenario(name: string, steps: Array<LoggedStep>): string {
  return [
    `  Scenario: ${name}`,
    ...formatSteps(steps).map((line) => `    ${line}`),
  ].join('\n')
}

/**
 * The editor suffix for user actions: the vocabulary leaves it out for
 * Editor A.
 */
export function inEditor(name: EditorName): string {
  return name === 'Editor A' ? '' : ` in ${name}`
}

export function quoted(text: string): string {
  return `"${text}"`
}

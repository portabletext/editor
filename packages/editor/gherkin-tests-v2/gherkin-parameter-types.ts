import {createParameterType, type ParameterType} from 'racejar'
import {parseGherkinTextParameter} from '../gherkin-tests/gherkin-step-helpers'

export type Parameter = {
  [K in keyof typeof parameterType]: (typeof parameterType)[K] extends ParameterType<
    infer TParameterType
  >
    ? TParameterType
    : never
}

export const parameterType = {
  blockObject: createParameterType<'image'>({
    name: 'block-object',
    matcher: /"(image)"/,
  }),
  button: createParameterType<
    | 'ArrowUp'
    | 'ArrowDown'
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'Backspace'
    | 'Delete'
    | 'Enter'
    | 'Escape'
    | 'Shift+Enter'
    | 'Space'
  >({
    name: 'button',
    matcher:
      /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Escape|Shift\+Enter|Space)"/,
  }),
  text: createParameterType<Array<string>>({
    name: 'text',
    matcher: /"([a-z-,#>\\n |\[\]]*)"/u,
    type: Array,
    transform: parseGherkinTextParameter,
  }),
}

export const parameterTypes = [
  parameterType.blockObject,
  parameterType.button,
  parameterType.text,
]

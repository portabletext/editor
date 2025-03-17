import {createParameterType, type ParameterType} from 'racejar'
import {parseTersePt} from '../src/internal-utils/terse-pt'

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
  placement: createParameterType<'auto' | 'after' | 'before'>({
    name: 'placement',
    matcher: /"(auto|after|before)"/,
  }),
  selectPosition: createParameterType<'start' | 'end' | 'none'>({
    name: 'select-position',
    matcher: /"(start|end|none)"/,
  }),
  text: createParameterType<Array<string>>({
    name: 'text',
    matcher: /"([a-z-,#>\\n |\[\]]*)"/u,
    type: Array,
    transform: parseTersePt,
  }),
}

export const parameterTypes = [
  parameterType.blockObject,
  parameterType.button,
  parameterType.placement,
  parameterType.selectPosition,
  parameterType.text,
]

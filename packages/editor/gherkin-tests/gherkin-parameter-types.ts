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
  annotation: createParameterType<'comment' | 'link'>({
    name: 'annotation',
    matcher: /"(comment|link)"/,
  }),
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
    matcher: /"([a-z-,#>\\n |\[\]😂😹:]*)"/u,
    type: Array,
    transform: parseTersePt,
  }),
}

export const parameterTypes = [
  parameterType.annotation,
  parameterType.blockObject,
  createParameterType({
    name: 'index',
    matcher: /"(\d)"/,
    type: Number,
    transform: (input) => Number.parseInt(input, 10),
  }),
  createParameterType({
    name: 'inline-object',
    matcher: /"(stock-ticker)"/,
  }),
  parameterType.button,
  createParameterType({
    name: 'key',
    matcher: /"([a-z]\d)"/,
  }),
  createParameterType({
    name: 'keys',
    matcher: /"(([a-z]\d)(,([a-z]\d))*)"/,
    type: Array,
    transform: (input) => input.split(','),
  }),
  createParameterType({
    name: 'decorator',
    matcher: /"(em|strong)"/,
  }),
  createParameterType({
    name: 'marks',
    matcher: /"((strong|em|[a-z]\d)(,(strong|em|[a-z]\d))*)"/,
    type: Array,
    transform: (input) => input.split(','),
  }),
  createParameterType({
    name: 'style',
    matcher: /"(normal|blockquote|h\d)"/,
  }),
  parameterType.text,
]

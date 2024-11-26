import {createParameterType} from 'racejar'
import {parseGherkinTextParameter} from './gherkin-step-helpers'

export const parameterTypes = [
  createParameterType({
    name: 'annotation',
    matcher: /"(comment|link)"/,
  }),
  createParameterType({
    name: 'block-object',
    matcher: /"(image)"/,
  }),
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
  createParameterType({
    name: 'button',
    matcher:
      /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Shift\+Enter|Space)"/,
  }),
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
  createParameterType({
    name: 'text',
    matcher: /"([a-z-,#>\\n |\[\]]*)"/,
    type: Array,
    transform: parseGherkinTextParameter,
  }),
]

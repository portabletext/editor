import {createParameterType} from '@sanity/gherkin-driver'

export const parameterTypes = [
  createParameterType(
    'annotation',
    /"(comment|link)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'block-object',
    /"(image)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'inline-object',
    /"(stock-ticker)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'button',
    /"(ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'key',
    /"([a-z]\d)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'keys',
    /"(([a-z]\d)(,([a-z]\d))*)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  createParameterType(
    'decorator',
    /"(em|strong)"/,
    String,
    (input) => input,
    false,
    true,
  ),
  createParameterType(
    'marks',
    /"((strong|em|[a-z]\d)(,(strong|em|[a-z]\d))*)"/,
    Array,
    (input) => input.split(','),
    false,
    true,
  ),
  createParameterType(
    'text',
    /"([a-z-,\\n ]*)"/,
    Array,
    (input) =>
      input.split(',').map((item) => {
        if (item === '\\n') {
          return '\n'
        }
        return item
      }),
    false,
    true,
  ),
]

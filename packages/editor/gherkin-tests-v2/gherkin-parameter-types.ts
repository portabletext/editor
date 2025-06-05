import {createParameterType, type ParameterType} from 'racejar'
import {parseTersePtString} from '../src/internal-utils/terse-pt'

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
  button: createParameterType<string>({
    name: 'button',
    matcher: /"(([A-Z]|[a-z]|{|}|>|\/|\+)+)"/,
    type: String,
  }),
  decorator: createParameterType<'em' | 'strong'>({
    name: 'decorator',
    matcher: /"(em|strong)"/,
  }),
  index: createParameterType({
    name: 'index',
    matcher: /"(\d)"/,
    type: Number,
    transform: (input) => Number.parseInt(input, 10),
  }),
  inlineObject: createParameterType<'stock-ticker'>({
    name: 'inline-object',
    matcher: /"(stock-ticker)"/,
  }),
  key: createParameterType<'key'>({
    name: 'key',
    matcher: /"([a-z]\d)"/,
  }),
  keyKeys: createParameterType<Array<string>>({
    name: 'keyKeys',
    matcher: /"(([a-z]\d)(,([a-z]\d))*)"/,
    type: Array,
    transform: (input) => input.split(','),
  }),
  marks: createParameterType<Array<string>>({
    name: 'marks',
    matcher: /"((strong|em|[a-z]\d)(,(strong|em|[a-z]\d))*)"/,
    type: Array,
    transform: (input) => input.split(','),
  }),
  placement: createParameterType<'auto' | 'after' | 'before'>({
    name: 'placement',
    matcher: /"(auto|after|before)"/,
  }),
  selectPosition: createParameterType<'start' | 'end' | 'none'>({
    name: 'select-position',
    matcher: /"(start|end|none)"/,
  }),
  style: createParameterType({
    name: 'style',
    matcher: /"(normal|blockquote|h\d)"/,
  }),
  text: createParameterType<Array<string>>({
    name: 'text',
    matcher: /"([a-z-,#>:\\n \d|\[\]]*)"/u,
    type: Array,
    transform: parseTersePtString,
  }),
}

export const parameterTypes = [
  parameterType.annotation,
  parameterType.blockObject,
  parameterType.button,
  parameterType.decorator,
  parameterType.index,
  parameterType.inlineObject,
  parameterType.key,
  parameterType.keyKeys,
  parameterType.marks,
  parameterType.placement,
  parameterType.selectPosition,
  parameterType.style,
  parameterType.text,
]

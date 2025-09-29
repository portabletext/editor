import {parseTersePtString} from '@portabletext/test'
import {createParameterType, type ParameterType} from 'racejar'

/**
 * @internal
 */
export type Parameter = {
  [K in keyof typeof parameterType]: (typeof parameterType)[K] extends ParameterType<
    infer TParameterType
  >
    ? TParameterType
    : never
}

const parameterType = {
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
  tersePt: createParameterType<Array<string>>({
    name: 'terse-pt',
    matcher: /"([A-Za-z-,#>:\\n \d|{}()'"‘’“”?—.…→©]*)"/u,
    type: Array,
    transform: parseTersePtString,
  }),
  text: createParameterType<string>({
    name: 'text',
    matcher: /"([a-z]*)"/u,
    type: String,
  }),
}

/**
 * @internal
 */
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
  parameterType.tersePt,
  parameterType.text,
]

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
  eventDeleteOptions: createParameterType<{
    direction?: 'backward' | 'forward'
    unit?: 'word' | 'line' | 'child' | 'block'
  }>({
    name: 'event-delete-options',
    matcher: /(?: (backward|forward))?(?: by (word|line|child|block))?/,
    transform: (direction, unit) => {
      if (direction && direction !== 'backward' && direction !== 'forward') {
        throw new Error('Invalid direction')
      }
      if (
        unit &&
        unit !== 'word' &&
        unit !== 'line' &&
        unit !== 'child' &&
        unit !== 'block'
      ) {
        throw new Error('Invalid unit')
      }
      return {
        ...(direction === 'backward' || direction === 'forward'
          ? {direction}
          : {}),
        ...(unit === 'word' ||
        unit === 'line' ||
        unit === 'child' ||
        unit === 'block'
          ? {unit}
          : {}),
      }
    },
  }),
  eventLocation: createParameterType<string>({
    name: 'event-location',
    matcher:
      /(?: at (?:the following range|"(?:[^"\\]|\\.)*"|block \d+ offset \d+ through block \d+ offset \d+)(?: in backward order)?)?/,
    transform: (location) => location.replace(/^ at /, ''),
  }),
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
    matcher: /"(code|em|strong)"/,
  }),
  direction: createParameterType<'forwards' | 'backwards'>({
    name: 'direction',
    matcher: /"(forwards|backwards)"/,
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
    matcher: /"((code|strong|em|[a-z]\d)(,(code|strong|em|[a-z]\d))*)"/,
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
  shortcut: createParameterType<
    | 'deleteWord.backward'
    | 'deleteWord.forward'
    | 'deleteLine.backward'
    | 'deleteLine.forward'
  >({
    name: 'shortcut',
    matcher:
      /"(deleteWord\.backward|deleteWord\.forward|deleteLine\.backward|deleteLine\.forward)"/,
  }),
  style: createParameterType({
    name: 'style',
    matcher: /"(normal|blockquote|h\d)"/,
  }),
  tersePt: createParameterType<Array<string>>({
    name: 'terse-pt',
    matcher: /"(.*)"/u,
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
  parameterType.eventDeleteOptions,
  parameterType.eventLocation,

  parameterType.annotation,
  parameterType.blockObject,
  parameterType.button,
  parameterType.decorator,
  parameterType.direction,
  parameterType.index,
  parameterType.inlineObject,
  parameterType.key,
  parameterType.keyKeys,
  parameterType.marks,
  parameterType.placement,
  parameterType.selectPosition,
  parameterType.shortcut,
  parameterType.style,
  parameterType.tersePt,
  parameterType.text,
]

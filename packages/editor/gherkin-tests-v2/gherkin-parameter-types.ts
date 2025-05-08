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
  decorator: createParameterType<'em' | 'strong'>({
    name: 'decorator',
    matcher: /"(em|strong)"/,
  }),
  inlineObject: createParameterType<'stock-ticker'>({
    name: 'inline-object',
    matcher: /"(stock-ticker)"/,
  }),
  keyKeys: createParameterType({
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
  text: createParameterType<Array<string>>({
    name: 'text',
    matcher: /"([a-z-,#>\\n |\[\]]*)"/u,
    type: Array,
    transform: parseTersePt,
  }),
}

export const parameterTypes = [
  parameterType.annotation,
  parameterType.blockObject,
  parameterType.button,
  parameterType.decorator,
  parameterType.inlineObject,
  parameterType.keyKeys,
  parameterType.marks,
  parameterType.placement,
  parameterType.selectPosition,
  parameterType.text,
]

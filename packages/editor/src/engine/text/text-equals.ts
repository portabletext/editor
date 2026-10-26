import {isDeepEqual} from '../../internal-utils/equality'
import type {TextEqualsOptions} from '../interfaces/text'

type SpanNode = {
  _type: string
  _key: string
  text?: string
  marks?: Array<string>
}

export function textEquals(
  text: SpanNode,
  another: SpanNode,
  options: TextEqualsOptions = {},
): boolean {
  const {loose = false} = options

  function omitTextAndKey(obj: SpanNode) {
    const {_key, ...rest} = obj
    if ('text' in rest) {
      const {text: _text, ...withoutText} = rest
      return withoutText
    }
    return rest
  }

  return isDeepEqual(
    loose ? omitTextAndKey(text) : text,
    loose ? omitTextAndKey(another) : another,
  )
}

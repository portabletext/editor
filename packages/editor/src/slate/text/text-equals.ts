import type {Text, TextEqualsOptions} from '../interfaces/text'
import {isDeepEqual} from '../utils/deep-equal'

export function textEquals(
  text: Text,
  another: Text,
  options: TextEqualsOptions = {},
): boolean {
  const {loose = false} = options

  function omitText(obj: Record<any, any>) {
    const {text: _text, ...rest} = obj
    return rest
  }

  return isDeepEqual(
    loose ? omitText(text) : text,
    loose ? omitText(another) : another,
  )
}

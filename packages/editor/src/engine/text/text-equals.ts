import {isDeepEqual} from '../../internal-utils/equality'

type SpanNode = {
  _type: string
  _key: string
  text?: string
  marks?: Array<string>
}

export function textEquals(text: SpanNode, another: SpanNode): boolean {
  return isDeepEqual(text, another)
}

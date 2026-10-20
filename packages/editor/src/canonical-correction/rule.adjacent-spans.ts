import {isSpan, isTextBlock, type PortableTextSpan} from '@portabletext/schema'
import type {CorrectionEntry} from '../caret-correction/correction-entry'
import {isDeepEqual} from '../internal-utils/equality'
import type {CanonicalContext, CanonicalCorrection} from './types'

export function getAdjacentSpansCorrection(
  context: CanonicalContext,
  entry: CorrectionEntry,
): CanonicalCorrection | undefined {
  if (!isTextBlock({schema: context.schema}, entry.node)) {
    return undefined
  }

  for (let index = 1; index < entry.node.children.length; index++) {
    const child = entry.node.children[index]!
    const previous = entry.node.children[index - 1]!
    if (
      !isSpan({schema: context.schema}, child) ||
      !isSpan({schema: context.schema}, previous)
    ) {
      continue
    }

    const childPath = [...entry.path, 'children', {_key: child._key}]
    if (child.text === '') {
      return {rule: 'adjacent-spans', type: 'unset', path: childPath}
    }
    if (previous.text === '') {
      return {
        rule: 'adjacent-spans',
        type: 'unset',
        path: [...entry.path, 'children', {_key: previous._key}],
      }
    }
    if (looselyEqualSpans(child, previous)) {
      return {
        rule: 'adjacent-spans',
        type: 'merge',
        path: childPath,
        position: previous.text.length,
      }
    }
  }

  return undefined
}

function looselyEqualSpans(
  span: PortableTextSpan,
  another: PortableTextSpan,
): boolean {
  const {_key: _spanKey, text: _spanText, ...spanProperties} = span
  const {_key: _anotherKey, text: _anotherText, ...anotherProperties} = another
  return isDeepEqual(spanProperties, anotherProperties)
}

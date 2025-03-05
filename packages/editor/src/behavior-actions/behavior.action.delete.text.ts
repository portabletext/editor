import {Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/ranges'
import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import * as selectors from '../selectors'
import * as utils from '../utils'
import type {BehaviorActionImplementation} from './behavior.actions'

export const deleteTextActionImplementation: BehaviorActionImplementation<
  'delete.text'
> = ({context, action}) => {
  const value = fromSlateValue(
    action.editor.children,
    context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(action.editor),
  )

  const selection = utils.blockOffsetsToSelection({
    value,
    offsets: {
      anchor: action.anchor,
      focus: action.focus,
    },
  })

  if (!selection) {
    throw new Error('Unable to find selection from block offsets')
  }

  const trimmedSelection = selectors.getTrimmedSelection({
    beta: {hasTag: () => false, internalDrag: undefined},
    context: {
      converters: [],
      schema: context.schema,
      keyGenerator: context.keyGenerator,
      activeDecorators: [],
      readOnly: false,
      value,
      selection,
    },
  })

  if (!trimmedSelection) {
    throw new Error('Unable to find trimmed selection')
  }

  const range = toSlateRange(trimmedSelection, action.editor)

  if (!range) {
    throw new Error('Unable to find Slate range from trimmed selection')
  }

  Transforms.delete(action.editor, {
    at: range,
  })
}

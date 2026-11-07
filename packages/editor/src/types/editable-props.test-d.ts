import {describe, test} from 'vitest'
import type {PortableTextEditableProps} from '../editor/Editable'

describe('PortableTextEditableProps', () => {
  test('`rangeDecorations` is not a prop', () => {
    const props: PortableTextEditableProps = {
      // @ts-expect-error - removed in v9, register decorations instead
      rangeDecorations: [],
    }

    void props
  })
})

import type {OperationImplementation} from './operation.types'

export const removeTextOperationImplementation: OperationImplementation<
  'remove.text'
> = ({operation}) => {
  operation.editor.apply({
    type: 'remove_text',
    path: operation.at,
    offset: operation.offset,
    text: operation.text,
  })
}

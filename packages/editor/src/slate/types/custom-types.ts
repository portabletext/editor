/**
 * Extendable Custom Types Interface
 */

type ExtendableTypes =
  | 'Editor'
  | 'Element'
  | 'ObjectNode'
  | 'Text'
  | 'Selection'
  | 'Range'
  | 'Point'
  | 'Operation'
  | 'InsertNodeOperation'
  | 'InsertTextOperation'
  | 'RemoveNodeOperation'
  | 'RemoveTextOperation'
  | 'SetNodeOperation'
  | 'SetNodeKeyedOperation'
  | 'SetSelectionOperation'

export interface CustomTypes {
  [key: string]: unknown
}

export type ExtendedType<
  K extends ExtendableTypes,
  B,
> = unknown extends CustomTypes[K] ? B : CustomTypes[K]

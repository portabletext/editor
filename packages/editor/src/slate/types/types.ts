export type LeafEdge = 'start' | 'end'

export type MoveUnit = 'offset' | 'character' | 'word' | 'line'

export type RangeDirection = TextDirection | 'outward' | 'inward'

export type RangeMode = 'highest' | 'lowest'

export type SelectionEdge = 'anchor' | 'focus' | 'start' | 'end'

export type TextDirection = 'forward' | 'backward'

export type TextUnit = 'character' | 'word' | 'line' | 'block'

export type TextUnitAdjustment = TextUnit | 'offset'

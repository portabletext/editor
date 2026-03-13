import {NodeTransforms} from './node'
import {SelectionTransforms} from './selection'
import {TextTransforms} from './text'

export const Transforms: NodeTransforms & SelectionTransforms & TextTransforms =
  {
    ...NodeTransforms,
    ...SelectionTransforms,
    ...TextTransforms,
  }

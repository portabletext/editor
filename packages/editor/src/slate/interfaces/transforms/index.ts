import {NodeTransforms} from './node'
import {SelectionTransforms} from './selection'

export const Transforms: NodeTransforms & SelectionTransforms = {
  ...NodeTransforms,
  ...SelectionTransforms,
}

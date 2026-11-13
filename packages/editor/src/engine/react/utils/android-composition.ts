import type {Editor} from '../../interfaces/editor'
import type {Path} from '../../interfaces/path'

export const androidComposition = new WeakMap<
  Editor,
  {elements: Array<HTMLElement>; paths: Array<Path>; applying: boolean}
>()

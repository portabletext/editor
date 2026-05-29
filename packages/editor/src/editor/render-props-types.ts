import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {Path} from '../engine/interfaces/path'
import type {LeafPosition} from '../engine/interfaces/text'

/**
 * `RenderElementProps` are passed to the `renderElement` handler.
 */
export interface RenderElementProps {
  children: any
  element: PortableTextTextBlock | PortableTextObject
  path: Path
  attributes: {
    'data-slate-node'?: 'element'
    'data-pt-block'?: 'container'
    'data-slate-void'?: true
    'data-pt-path': string
    'contentEditable'?: false
    'dir'?: 'rtl'
  }
}

/**
 * `RenderLeafProps` are passed to the `renderLeaf` handler.
 */
export interface RenderLeafProps {
  children: any
  /**
   * The leaf node with any applied decorations.
   * If no decorations are applied, it will be identical to the `text` property.
   */
  leaf: PortableTextSpan
  text: PortableTextSpan
  path: Path
  attributes: {
    'data-slate-leaf'?: true
    'data-pt-marks': true
  }
  /**
   * The position of the leaf within the Text node, only present when the text node is split by decorations.
   */
  leafPosition?: LeafPosition
}

/**
 * `RenderTextProps` are passed to the `renderText` handler.
 */
export interface RenderTextProps {
  text: PortableTextSpan
  children: any
  attributes: {
    'data-slate-node'?: 'text'
    'data-pt-path': string
  }
}

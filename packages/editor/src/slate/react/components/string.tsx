import {
  isSpan,
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {forwardRef, memo, useContext, useRef, useState} from 'react'
import {ParentContainerContext} from '../../../editor/parent-container-context'
import {getNodes} from '../../../node-traversal/get-nodes'
import {IS_ANDROID} from '../../dom/utils/environment'
import {end as editorEnd} from '../../editor/end'
import {start as editorStart} from '../../editor/start'
import type {Editor} from '../../interfaces/editor'
import type {Path} from '../../interfaces/path'
import {parentPath as getParentPath} from '../../path/parent-path'
import {pathEquals} from '../../path/path-equals'
import {useIsomorphicLayoutEffect} from '../hooks/use-isomorphic-layout-effect'
import {useSlateStatic} from '../hooks/use-slate-static'

/**
 * Leaf content strings.
 */

function getTextContent(editor: Editor, path: Path): string {
  const start = editorStart(editor, path)
  const end = editorEnd(editor, path)
  let text = ''

  for (const {node, path: nodePath} of getNodes(editor, {
    from: start.path,
    to: end.path,
    match: (n) => isSpan({schema: editor.schema}, n),
  })) {
    if (!isSpan({schema: editor.schema}, node)) {
      continue
    }
    let nodeText = node.text
    if (pathEquals(nodePath, end.path)) {
      nodeText = nodeText.slice(0, end.offset)
    }
    if (pathEquals(nodePath, start.path)) {
      nodeText = nodeText.slice(start.offset)
    }
    text += nodeText
  }

  return text
}

const SlateString = (props: {
  isLast: boolean
  leaf: PortableTextSpan
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  text: PortableTextSpan
}) => {
  const {isLast, leaf, parent, path, text} = props
  const editor = useSlateStatic()
  const parentPath = getParentPath(path)
  const leafText = leaf.text ?? ''

  // COMPAT: If this is the last text node in an empty block, render a zero-
  // width space that will convert into a line break when copying and pasting
  // to support expected plain text.
  if (
    leafText === '' &&
    isTextBlock({schema: editor.schema}, parent) &&
    parent.children[parent.children.length - 1] === text &&
    getTextContent(editor, parentPath) === ''
  ) {
    return <ZeroWidthString isLineBreak />
  }

  // COMPAT: If the text is empty, it's because it's on the edge of an inline
  // node, so we render a zero-width space so that the selection can be
  // inserted next to it still.
  if (leafText === '') {
    return <ZeroWidthString />
  }

  // COMPAT: Browsers will collapse trailing new lines at the end of blocks,
  // so we need to add an extra trailing new lines to prevent that.
  if (isLast && leafText.slice(-1) === '\n') {
    return <TextString isTrailing text={leafText} />
  }

  return <TextString text={leafText} />
}

/**
 * Leaf strings with text in them.
 */
const TextString = (props: {text: string; isTrailing?: boolean}) => {
  const {text, isTrailing = false} = props
  const containerScope = useContext(ParentContainerContext)
  const ref = useRef<HTMLSpanElement>(null)
  const getTextContent = () => {
    return `${text ?? ''}${isTrailing ? '\n' : ''}`
  }
  const [initialText] = useState(getTextContent)

  // This is the actual text rendering boundary where we interface with the DOM
  // The text is not rendered as part of the virtual DOM, as since we handle basic character insertions natively,
  // updating the DOM is not a one way dataflow anymore. What we need here is not reconciliation and diffing
  // with previous version of the virtual DOM, but rather diffing with the actual DOM element, and replace the DOM <span> content
  // exactly if and only if its current content does not match our current virtual DOM.
  // Otherwise the DOM TextNode would always be replaced by React as the user types, which interferes with native text features,
  // eg makes native spellcheck opt out from checking the text node.

  // useLayoutEffect: updating our span before browser paint
  useIsomorphicLayoutEffect(() => {
    // null coalescing text to make sure we're not outputing "null" as a string in the extreme case it is nullish at runtime
    const textWithTrailing = getTextContent()

    if (ref.current && ref.current.textContent !== textWithTrailing) {
      ref.current.textContent = textWithTrailing
    }

    // intentionally not specifying dependencies, so that this effect runs on every render
    // as this effectively replaces "specifying the text in the virtual DOM under the <span> below" on each render
  })

  // We intentionally render a memoized <span> that only receives the initial text content when the component is mounted.
  // We defer to the layout effect above to update the `textContent` of the span element when needed.
  return (
    <MemoizedText ref={ref} containerScope={containerScope !== undefined}>
      {initialText}
    </MemoizedText>
  )
}

const MemoizedText = memo(
  forwardRef<HTMLSpanElement, {children: string; containerScope: boolean}>(
    (props, ref) => {
      if (props.containerScope) {
        return (
          <span data-pt-text ref={ref}>
            {props.children}
          </span>
        )
      }
      return (
        <span data-slate-string data-pt-text ref={ref}>
          {props.children}
        </span>
      )
    },
  ),
)

/**
 * Leaf strings without text, render as zero-width strings.
 */

const ZeroWidthString = (props: {isLineBreak?: boolean}) => {
  const {isLineBreak = false} = props
  const containerScope = useContext(ParentContainerContext)

  const slateValue = isLineBreak ? 'n' : 'z'
  const attributes: {
    'data-slate-zero-width'?: string
    'data-pt-zero-width': true
    'data-pt-line-break'?: true
  } = containerScope
    ? {
        'data-pt-zero-width': true,
        ...(isLineBreak ? {'data-pt-line-break': true as const} : {}),
      }
    : {
        'data-slate-zero-width': slateValue,
        'data-pt-zero-width': true,
        ...(isLineBreak ? {'data-pt-line-break': true as const} : {}),
      }

  // FIXME: Inserting the \uFEFF on iOS breaks capitalization at the start of an
  // empty editor (https://github.com/ianstormtaylor/slate/issues/5199).
  //
  // However, not inserting the \uFEFF on iOS causes the editor to crash when
  // inserting any text using an IME at the start of a block. This appears to
  // be because accepting an IME suggestion when at the start of a block (no
  // preceding \uFEFF) removes one or more DOM elements that `toSlateRange`
  // depends on. (https://github.com/ianstormtaylor/slate/issues/5703)
  return (
    <span {...attributes}>
      {!IS_ANDROID || !isLineBreak ? '\uFEFF' : null}
      {isLineBreak ? <br /> : null}
    </span>
  )
}

export default SlateString

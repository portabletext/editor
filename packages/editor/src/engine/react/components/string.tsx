import {
  isSpan,
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {forwardRef, memo, useRef, useState} from 'react'
import {getNodes} from '../../../traversal/get-nodes'
import {IS_ANDROID} from '../../dom/utils/environment'
import {end as editorEnd} from '../../editor/end'
import {start as editorStart} from '../../editor/start'
import type {Editor} from '../../interfaces/editor'
import type {Path} from '../../interfaces/path'
import {parentPath as getParentPath} from '../../path/parent-path'
import {pathEquals} from '../../path/path-equals'
import {useEngineStatic} from '../hooks/use-engine-static'
import {useIsomorphicLayoutEffect} from '../hooks/use-isomorphic-layout-effect'

/**
 * Leaf content strings.
 */

function getTextContent(editor: Editor, path: Path): string {
  const start = editorStart(editor, path)
  const end = editorEnd(editor, path)
  let text = ''

  for (const {node, path: nodePath} of getNodes(editor.snapshot, {
    from: start.path,
    to: end.path,
    match: (n) => isSpan({schema: editor.snapshot.context.schema}, n),
  })) {
    if (!isSpan({schema: editor.snapshot.context.schema}, node)) {
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

const EngineString = (props: {
  isLast: boolean
  leaf: PortableTextSpan
  parent: PortableTextTextBlock | PortableTextObject
  path: Path
  text: PortableTextSpan
}) => {
  // `EngineString` returns a `<TextString>` element whose only prop is the
  // leaf's text. React Compiler memoizes that element on `text`, so when the
  // text is unchanged it reuses the previous element and React bails on
  // re-rendering `TextString`. That defeats `TextString`'s reconcile-on-render
  // layout effect (see below), which is the only thing that resets a text node
  // the browser mutated out from under the model (native insertion). Opt this
  // component out of the compiler so the element is recreated every render and
  // `TextString` always gets a chance to reconcile.
  'use no memo'
  const {isLast, leaf, parent, path, text} = props
  const editor = useEngineStatic()
  const parentPath = getParentPath(path)
  const leafText = leaf.text ?? ''

  // COMPAT: If this is the last text node in an empty block, render a zero-
  // width space that will convert into a line break when copying and pasting
  // to support expected plain text.
  if (
    leafText === '' &&
    isTextBlock({schema: editor.snapshot.context.schema}, parent) &&
    parent.children[parent.children.length - 1] === text &&
    getTextContent(editor, parentPath) === ''
  ) {
    // COMPAT: On Android the empty line and the text it turns into must be
    // one DOM element with one text node. The IME composes in a text node it
    // creates inside the empty line, and swapping the element on the first
    // flush takes that node away and restarts the composition.
    if (IS_ANDROID) {
      return <TextString text="" isLineBreak />
    }

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
const TextString = (props: {
  text: string
  isTrailing?: boolean
  isLineBreak?: boolean
}) => {
  // This component reconciles the DOM text node against the model on every
  // render (the dependency-less layout effect below). React Compiler must not
  // memoize it: a skipped render is a skipped reconcile, which strands any
  // text the browser wrote ahead of the model. Keep it uncompiled regardless
  // of which build (lib, tests, playground) sets the react-compiler boundary.
  'use no memo'
  const {text, isTrailing = false, isLineBreak = false} = props
  const ref = useRef<HTMLSpanElement>(null)
  const getTextContent = () => {
    return `${text ?? ''}${isTrailing ? '\n' : ''}`
  }
  const [initialText] = useState(getTextContent)
  const [initialLineBreak] = useState(isLineBreak)

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

    if (IS_ANDROID && ref.current) {
      reconcileAndroidString(ref.current, textWithTrailing, isLineBreak)
      return
    }

    if (ref.current && ref.current.textContent !== textWithTrailing) {
      ref.current.textContent = textWithTrailing
    }

    // intentionally not specifying dependencies, so that this effect runs on every render
    // as this effectively replaces "specifying the text in the virtual DOM under the <span> below" on each render
  })

  // We intentionally render a memoized <span> that only receives the initial text content when the component is mounted.
  // We defer to the layout effect above to update the `textContent` of the span element when needed.
  if (initialLineBreak) {
    return <MemoizedLineBreak ref={ref} />
  }

  return <MemoizedText ref={ref}>{initialText}</MemoizedText>
}

const MemoizedText = memo(
  forwardRef<HTMLSpanElement, {children: string}>((props, ref) => {
    return (
      <span data-pt-text ref={ref}>
        {props.children}
      </span>
    )
  }),
)

const MemoizedLineBreak = memo(
  forwardRef<HTMLSpanElement>((_props, ref) => {
    return (
      <span data-pt-zero-width data-pt-line-break ref={ref}>
        <br />
      </span>
    )
  }),
)

/**
 * Brings an Android string element in line with the model without replacing
 * the text node in it, since that node may be the one the IME composes in.
 */
function reconcileAndroidString(
  element: HTMLSpanElement,
  text: string,
  isLineBreak: boolean,
) {
  if (isLineBreak) {
    element.removeAttribute('data-pt-text')
    element.setAttribute('data-pt-zero-width', 'true')
    element.setAttribute('data-pt-line-break', 'true')

    for (const child of Array.from(element.childNodes)) {
      if (child.nodeName !== 'BR') {
        element.removeChild(child)
      }
    }

    if (!element.querySelector('br')) {
      element.appendChild(element.ownerDocument.createElement('br'))
    }

    return
  }

  element.removeAttribute('data-pt-zero-width')
  element.removeAttribute('data-pt-line-break')
  element.setAttribute('data-pt-text', 'true')

  let textNode: Text | null = null

  for (const child of Array.from(element.childNodes)) {
    if (!textNode && child.nodeType === Node.TEXT_NODE) {
      textNode = child as Text
      continue
    }

    element.removeChild(child)
  }

  if (!textNode) {
    element.appendChild(element.ownerDocument.createTextNode(text))
    return
  }

  if (textNode.data !== text) {
    textNode.data = text
  }
}

/**
 * Leaf strings without text, render as zero-width strings.
 */

const ZeroWidthString = (props: {isLineBreak?: boolean}) => {
  const {isLineBreak = false} = props

  const attributes: {
    'data-pt-zero-width': true
    'data-pt-line-break'?: true
  } = {
    'data-pt-zero-width': true,
    ...(isLineBreak ? {'data-pt-line-break': true as const} : {}),
  }

  // FIXME: Inserting the \uFEFF on iOS breaks capitalization at the start of an
  // empty editor.
  //
  // However, not inserting the \uFEFF on iOS causes the editor to crash when
  // inserting any text using an IME at the start of a block. This appears to
  // be because accepting an IME suggestion when at the start of a block (no
  // preceding \uFEFF) removes one or more DOM elements that `toEditorSelection`
  // depends on.
  return (
    <span {...attributes}>
      {!IS_ANDROID || !isLineBreak ? '\uFEFF' : null}
      {isLineBreak ? <br /> : null}
    </span>
  )
}

export default EngineString

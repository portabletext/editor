import {OnPasteFn, PortableTextMemberSchemaTypes} from '@portabletext/editor'
import {htmlToBlocks, type DeserializerRule} from '@sanity/block-tools'
import {Path} from '@sanity/types'
import {micromark} from 'micromark'

export const handlePaste: OnPasteFn = (input) => {
  const {event, schemaTypes, path} = input
  const text = event.clipboardData.getData('text/plain')
  const json = event.clipboardData.getData('application/json')

  if (text && !json) {
    const html = micromark(text)
    return html ? convertHtmlToSanityPortableTextPatch(html, schemaTypes, path) : undefined
  }

  return undefined
}

function convertHtmlToSanityPortableTextPatch(
  html: string,
  schemaTypes: PortableTextMemberSchemaTypes,
  path: Path,
) {
  if (!isCodeTypeAvailable(schemaTypes)) {
    return undefined
  }

  const blocks = htmlToBlocks(html, schemaTypes.portableText, {
    rules: [{deserialize: deserializeCodeBlockElement}],
  })

  return blocks ? {insert: blocks, path} : undefined
}

function isCodeTypeAvailable(schemaTypes: PortableTextMemberSchemaTypes): boolean {
  const hasCodeType = schemaTypes.blockObjects.some((type) => type.name === 'code')
  if (!hasCodeType) {
    console.warn('Run `sanity install @sanity/code-input` and add `type: "code"` to your schema.')
  }
  return hasCodeType
}

const deserializeCodeBlockElement: DeserializerRule['deserialize'] = (el, next, createBlock) => {
  if (!isElementNode(el)) {
    return undefined
  }

  if (!isPreformattedText(el)) return undefined

  const codeElement = el.children[0]
  const childNodes = getCodeChildNodes(el, codeElement as Element)
  const codeText = extractTextFromNodes(childNodes)
  const language = mapLanguageAliasToActualLanguage(getLanguageAlias(codeElement as Element))

  return createBlock({
    _type: 'code',
    code: codeText,
    language,
  })
}

function isElementNode(el: Node): el is Element {
  return el.nodeType === Node.ELEMENT_NODE
}

function isPreformattedText(el: Element): boolean {
  return el.children && !!el.tagName && el.tagName.toLowerCase() === 'pre'
}

function getCodeChildNodes(el: Element, codeElement: Element): NodeListOf<ChildNode> {
  return codeElement && codeElement.tagName.toLowerCase() === 'code'
    ? codeElement.childNodes
    : el.childNodes
}

function extractTextFromNodes(childNodes: NodeListOf<ChildNode>): string {
  return Array.from(childNodes)
    .map((node) => node.textContent || '')
    .join('')
}

function getLanguageAlias(codeElement: Element): string {
  return codeElement.className.replace('language-', '')
}

const languageMapping = new Map([
  ['js', 'javascript'],
  ['ts', 'typescript'],
])

function mapLanguageAliasToActualLanguage(languageAlias: string): string {
  return languageMapping.get(languageAlias) ?? languageAlias
}

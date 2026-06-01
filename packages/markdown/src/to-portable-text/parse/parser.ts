/**
 * Parser for `@portabletext/markdown` v2 (spike).
 *
 * Consumes block tokens from `BlockLexer` and inline tokens from
 * `lexInline`, emitting Portable Text blocks directly. There is no
 * intermediate AST.
 *
 * Spike scope: paragraph, heading h1-h6, fenced code, thematic break,
 * blockquote (flat path with `style: 'blockquote'`), bullet/ordered list
 * (flat path with `listItem` + `level`). Inline: strong/em/code/link/
 * autolink/hardbreak. See /specs/portabletext-markdown-v2.md §8.1.
 *
 * The parser is matcher-aware: every node consults the corresponding
 * matcher option (`block.normal`, `block.h1`, `marks.strong`, …) to learn
 * what `style` / `listItem` / decorator / annotation `_type` to emit.
 * Matchers returning `undefined` cause the node to fall back to plain
 * text (heading semantics dropped, decorator dropped, list-item dropped).
 *
 * @internal
 */

import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import {
  blockquoteStyleDefinition,
  defaultCalloutObjectDefinition,
  defaultCodeDecoratorDefinition,
  defaultCodeObjectDefinition,
  defaultEmDecoratorDefinition,
  defaultHorizontalRuleObjectDefinition,
  defaultHtmlObjectDefinition,
  defaultImageObjectDefinition,
  defaultLinkObjectDefinition,
  defaultOrderedListItemDefinition,
  defaultSchema,
  defaultStrikeThroughDecoratorDefinition,
  defaultStrongDecoratorDefinition,
  defaultTaskListItemDefinition,
  defaultUnorderedListItemDefinition,
  h1StyleDefinition,
  h2StyleDefinition,
  h3StyleDefinition,
  h4StyleDefinition,
  h5StyleDefinition,
  h6StyleDefinition,
  normalStyleDefinition,
} from '../../default-schema'
import {defaultKeyGenerator} from '../../key-generator'
import {
  buildAnnotationMatcher,
  buildDecoratorMatcher,
  buildListItemMatcher,
  buildObjectMatcher,
  buildStyleMatcher,
  type AnnotationMatcher,
  type DecoratorMatcher,
  type ListItemMatcher,
  type ObjectMatcher,
  type StyleMatcher,
} from '../matchers'
import {InlineTokenType, lexInline, type InlineToken} from './inline-lexer'

export interface ParseOptions {
  schema?: Schema
  keyGenerator?: () => string
  marks?: {
    strong?: DecoratorMatcher
    em?: DecoratorMatcher
    code?: DecoratorMatcher
    strikeThrough?: DecoratorMatcher
    link?: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block?: {
    normal?: StyleMatcher
    blockquote?: StyleMatcher
    h1?: StyleMatcher
    h2?: StyleMatcher
    h3?: StyleMatcher
    h4?: StyleMatcher
    h5?: StyleMatcher
    h6?: StyleMatcher
  }
  listItem?: {
    number?: ListItemMatcher
    bullet?: ListItemMatcher
    task?: ListItemMatcher
  }
  types?: {
    code?: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule?: ObjectMatcher
    image?: ObjectMatcher<{
      src: string
      alt: string
      title: string | undefined
    }>
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{
      headerRows: number | undefined
      rows: Array<{
        _key: string
        _type: 'row'
        cells: Array<{
          _type: 'cell'
          _key: string
          value: Array<PortableTextBlock>
        }>
      }>
    }>
    callout?: ObjectMatcher<{tone: string; content: Array<PortableTextBlock>}>
    blockquote?: ObjectMatcher<{content: Array<PortableTextBlock>}>
    list?: ObjectMatcher<{
      kind: 'bullet' | 'number' | 'task'
      items: Array<{
        _type: 'list-item'
        _key: string
        checked?: boolean
        content: Array<PortableTextBlock | PortableTextObject>
      }>
    }>
  }
  html?: {
    inline?: 'skip' | 'text'
  }
}

export interface ResolvedOptions {
  html?: {inline?: 'skip' | 'text'}
  linkReferences?: import('./link-references').LinkReferenceMap
  schema: Schema
  keyGenerator: () => string
  marks: {
    strong: DecoratorMatcher
    em: DecoratorMatcher
    code: DecoratorMatcher
    strikeThrough: DecoratorMatcher
    link: AnnotationMatcher<{href: string; title: string | undefined}>
  }
  block: {
    normal: StyleMatcher
    blockquote: StyleMatcher
    h1: StyleMatcher
    h2: StyleMatcher
    h3: StyleMatcher
    h4: StyleMatcher
    h5: StyleMatcher
    h6: StyleMatcher
  }
  listItem: {
    number: ListItemMatcher
    bullet: ListItemMatcher
    task: ListItemMatcher
  }
  types: {
    code: ObjectMatcher<{language: string | undefined; code: string}>
    horizontalRule: ObjectMatcher
    image?: ObjectMatcher<{src: string; alt: string; title: string | undefined}>
    html?: ObjectMatcher<{html: string}>
    table?: ObjectMatcher<{
      headerRows: number | undefined
      rows: Array<{
        _key: string
        _type: 'row'
        cells: Array<{
          _type: 'cell'
          _key: string
          value: Array<PortableTextBlock>
        }>
      }>
    }>
    callout?: ObjectMatcher<{tone: string; content: Array<PortableTextBlock>}>
    blockquote?: ObjectMatcher<{content: Array<PortableTextBlock>}>
    list?: ObjectMatcher<{
      kind: 'bullet' | 'number' | 'task'
      items: Array<{
        _type: 'list-item'
        _key: string
        checked?: boolean
        content: Array<PortableTextBlock | PortableTextObject>
      }>
    }>
  }
}

export function resolveOptions(options: ParseOptions): ResolvedOptions {
  return {
    schema: options.schema ?? defaultSchema,
    keyGenerator: options.keyGenerator ?? defaultKeyGenerator,
    marks: {
      strong:
        options.marks?.strong ??
        buildDecoratorMatcher(defaultStrongDecoratorDefinition),
      em:
        options.marks?.em ??
        buildDecoratorMatcher(defaultEmDecoratorDefinition),
      code:
        options.marks?.code ??
        buildDecoratorMatcher(defaultCodeDecoratorDefinition),
      strikeThrough:
        options.marks?.strikeThrough ??
        buildDecoratorMatcher(defaultStrikeThroughDecoratorDefinition),
      link:
        options.marks?.link ??
        buildAnnotationMatcher(defaultLinkObjectDefinition),
    },
    block: {
      normal: options.block?.normal ?? buildStyleMatcher(normalStyleDefinition),
      blockquote:
        options.block?.blockquote ??
        buildStyleMatcher(blockquoteStyleDefinition),
      h1: options.block?.h1 ?? buildStyleMatcher(h1StyleDefinition),
      h2: options.block?.h2 ?? buildStyleMatcher(h2StyleDefinition),
      h3: options.block?.h3 ?? buildStyleMatcher(h3StyleDefinition),
      h4: options.block?.h4 ?? buildStyleMatcher(h4StyleDefinition),
      h5: options.block?.h5 ?? buildStyleMatcher(h5StyleDefinition),
      h6: options.block?.h6 ?? buildStyleMatcher(h6StyleDefinition),
    },
    listItem: {
      number:
        options.listItem?.number ??
        buildListItemMatcher(defaultOrderedListItemDefinition),
      bullet:
        options.listItem?.bullet ??
        buildListItemMatcher(defaultUnorderedListItemDefinition),
      task:
        options.listItem?.task ??
        buildListItemMatcher(defaultTaskListItemDefinition),
    },
    types: {
      code:
        options.types?.code ?? buildObjectMatcher(defaultCodeObjectDefinition),
      horizontalRule:
        options.types?.horizontalRule ??
        buildObjectMatcher(defaultHorizontalRuleObjectDefinition),
      image:
        options.types?.image ??
        buildObjectMatcher(defaultImageObjectDefinition),
      html:
        options.types?.html ?? buildObjectMatcher(defaultHtmlObjectDefinition),
      table: options.types?.table,
      callout:
        options.types?.callout ??
        buildObjectMatcher(defaultCalloutObjectDefinition),
      blockquote: options.types?.blockquote,
      list: options.types?.list,
    },
    html: options.html,
  }
}

/**
 * Build inline children (spans + inline objects) for a text run without
 * allocating a block wrapper key. Used when merging an inline run into
 * an existing block (e.g. absorbing a list_item's adjacent paragraph
 * into a merged block).
 */
export function makeInlineChildren(
  body: string,
  options: ResolvedOptions,
): Array<PortableTextSpan | PortableTextObject> {
  const inline = lexInline(body, 1, {
    inlineHtml: options.html?.inline,
    linkReferences: options.linkReferences,
  })
  const {children} = foldInlineToSpans(inline, options)
  return children
}

export function makeTextBlock(
  styleKey: 'normal' | 'blockquote' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  body: string,
  options: ResolvedOptions,
  startLine: number,
): PortableTextTextBlock | undefined {
  const styleName = options.block[styleKey]({
    context: {schema: options.schema},
  })
  // If the style matcher doesn't resolve (e.g. h1 with no h1 schema), we
  // fall back to the 'normal' style matcher. If that also doesn't resolve,
  // the block is dropped (defensive — should never happen with default
  // schema).
  const resolvedStyle =
    styleName ?? options.block.normal({context: {schema: options.schema}})
  if (!resolvedStyle) {
    return undefined
  }

  // Allocate block key BEFORE span keys to match v1's order.
  const blockKey = options.keyGenerator()
  const inline = lexInline(body, startLine, {
    inlineHtml: options.html?.inline,
    linkReferences: options.linkReferences,
  })
  const {children, markDefs} = foldInlineToSpans(inline, options)
  return {
    _type: 'block',
    _key: blockKey,
    style: resolvedStyle,
    children,
    markDefs,
  } as PortableTextTextBlock
}

interface SpanState {
  text: string
  marks: Array<string>
}

function foldInlineToSpans(
  tokens: ReadonlyArray<InlineToken>,
  options: ResolvedOptions,
): {
  children: Array<PortableTextSpan>
  markDefs: Array<{_type: string; _key: string; [key: string]: unknown}>
} {
  const children: Array<PortableTextSpan> = []
  const markDefs: Array<{_type: string; _key: string; [key: string]: unknown}> =
    []
  // Each entry: the schema-resolved decorator name (or undefined for
  // `unknown`) and the original markdown marker text. When the matcher
  // returns undefined, we leak the marker into the span text on both
  // open and close so `**foo**` becomes literal `**foo**` text rather
  // than just `foo`.
  const decoratorStack: Array<{name: string | undefined; marker: string}> = []
  const annotationStack: Array<string> = []
  let current: SpanState = {text: '', marks: []}

  const flush = () => {
    if (current.text.length === 0) {
      return
    }
    children.push({
      _type: 'span',
      _key: options.keyGenerator(),
      text: current.text,
      marks: current.marks.slice(),
    } as PortableTextSpan)
    current = {text: '', marks: current.marks.slice()}
  }

  const updateMarks = () => {
    const active = decoratorStack
      .map((d) => d.name)
      .filter((d): d is string => Boolean(d))
    current.marks = [...active, ...annotationStack]
  }

  for (const t of tokens) {
    switch (t.type) {
      case InlineTokenType.Text: {
        current.text += t.text
        break
      }
      case InlineTokenType.SoftBreak:
      case InlineTokenType.HardBreak: {
        current.text += '\n'
        break
      }
      case InlineTokenType.StrongOpen: {
        const name = options.marks.strong({context: {schema: options.schema}})
        if (name) {
          flush()
        }
        decoratorStack.push({name, marker: '**'})
        if (name) {
          updateMarks()
        }
        break
      }
      case InlineTokenType.StrongClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.EmOpen: {
        const name = options.marks.em({context: {schema: options.schema}})
        if (name) {
          flush()
        }
        decoratorStack.push({name, marker: '_'})
        if (name) {
          updateMarks()
        }
        break
      }
      case InlineTokenType.EmClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.StrikeOpen: {
        const name = options.marks.strikeThrough({
          context: {schema: options.schema},
        })
        if (name) {
          flush()
        }
        decoratorStack.push({name, marker: '~~'})
        if (name) {
          updateMarks()
        }
        break
      }
      case InlineTokenType.StrikeClose: {
        const popped = decoratorStack.pop()
        if (popped?.name) {
          flush()
          updateMarks()
        }
        break
      }
      case InlineTokenType.CodeSpan: {
        const codeMark = options.marks.code({context: {schema: options.schema}})
        if (codeMark) {
          flush()
          children.push({
            _type: 'span',
            _key: options.keyGenerator(),
            text: t.text,
            marks: [...current.marks, codeMark],
          } as PortableTextSpan)
        } else {
          // No code decorator defined: re-emit the code text into the
          // current span (matches v1).
          current.text += t.text
        }
        break
      }
      case InlineTokenType.LinkOpen: {
        // Schema-probe BEFORE invoking the matcher: if no annotation is
        // declared at all, skip the matcher entirely (the link label
        // re-absorbs as plain text in the current span).
        const hasAnyAnnotation = options.schema.annotations.length > 0
        if (!hasAnyAnnotation) {
          annotationStack.push('')
          break
        }
        // Flush the pre-link text first so its span key is allocated
        // BEFORE the markDef key (matches v1's allocation order).
        flush()
        const annotation = options.marks.link({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {href: t.href ?? '', title: t.title},
        })
        if (annotation) {
          markDefs.push(
            annotation as {_type: string; _key: string; [key: string]: unknown},
          )
          annotationStack.push(annotation._key)
          updateMarks()
        } else {
          annotationStack.push('')
        }
        break
      }
      case InlineTokenType.LinkClose: {
        // Flush the link's inner text WITH the link mark still active,
        // then pop the annotation and refresh current.marks so the post-
        // link text accumulates without it.
        const top = annotationStack[annotationStack.length - 1]
        if (top && top !== '') {
          flush()
        }
        annotationStack.pop()
        updateMarks()
        break
      }
      case InlineTokenType.Image: {
        // Schema-probe BEFORE invoking the image matcher. When NO
        // image-like schema entry exists (any inline OR any block
        // object), the markdown text re-absorbs into the current
        // span as plain text. Consumer custom matchers may route the
        // image into any schema entry (e.g. 'photo'), so we accept
        // any non-empty inline/block-object array as "consumer wants
        // images."
        const hasAnyImageSchema =
          options.schema.inlineObjects.length > 0 ||
          options.schema.blockObjects.length > 0
        if (!hasAnyImageSchema) {
          const titlePart = t.title ? ` "${t.title}"` : ''
          current.text += `![${t.alt ?? ''}](${t.src ?? ''}${titlePart})`
          break
        }
        // Flush pre-image text span so its key is allocated before the
        // image matcher's key (matches v1).
        flush()
        // Try inline image matcher first. If schema lacks an inline
        // image entry, fall back to the BLOCK image matcher so v1's
        // single-key allocation is preserved.
        let imageValue = options.types.image?.({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {src: t.src ?? '', alt: t.alt ?? '', title: t.title},
          isInline: true,
        })
        if (!imageValue) {
          imageValue = options.types.image?.({
            context: {
              schema: options.schema,
              keyGenerator: options.keyGenerator,
            },
            value: {src: t.src ?? '', alt: t.alt ?? '', title: t.title},
            isInline: false,
          })
        }
        // Useful = matcher returned an object that carries the src.
        const imageIsUseful =
          imageValue &&
          Object.entries(imageValue).some(
            ([k, v]) =>
              k !== '_key' &&
              k !== '_type' &&
              k !== 'alt' &&
              k !== 'title' &&
              typeof v === 'string' &&
              v.length > 0,
          )
        if (imageIsUseful) {
          ;(children as Array<PortableTextSpan | PortableTextObject>).push(
            imageValue as PortableTextObject,
          )
        } else {
          // Useless or undefined: re-emit raw markdown into text buffer.
          const titlePart = t.title ? ` "${t.title}"` : ''
          current.text += `![${t.alt ?? ''}](${t.src ?? ''}${titlePart})`
        }
        break
      }
      case InlineTokenType.Autolink: {
        flush()
        const annotation = options.marks.link({
          context: {schema: options.schema, keyGenerator: options.keyGenerator},
          value: {href: t.href ?? '', title: undefined},
        })
        if (annotation) {
          markDefs.push(
            annotation as {_type: string; _key: string; [key: string]: unknown},
          )
          children.push({
            _type: 'span',
            _key: options.keyGenerator(),
            text: t.text,
            marks: [...current.marks, annotation._key],
          } as PortableTextSpan)
        } else {
          children.push({
            _type: 'span',
            _key: options.keyGenerator(),
            text: t.text,
            marks: [...current.marks],
          } as PortableTextSpan)
        }
        break
      }
    }
  }
  flush()

  if (children.length === 0) {
    children.push({
      _type: 'span',
      _key: options.keyGenerator(),
      text: '',
      marks: [],
    } as PortableTextSpan)
  }

  // Annotation stack uses '' as a sentinel for "no annotation"; strip those
  // from any per-span marks before returning (defensive — updateMarks
  // already excludes them).
  for (const child of children) {
    if (child._type === 'span') {
      child.marks = (child.marks ?? []).filter((m) => m !== '')
    }
  }

  return {children, markDefs}
}

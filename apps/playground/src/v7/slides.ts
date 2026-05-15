import type {PortableTextBlock} from '@portabletext/editor'

/**
 * The v7 deck content - the 11 architectural milestones, plus an intro,
 * a mid-deck reveal slide, and a closing arc slide.
 *
 * Each top-level entry is a `slide` container. The `content` field carries
 * a mix of text blocks, callouts, code blocks, tables, and rich-content
 * lists - the same building blocks v7 itself enables.
 */

let nextKey = 0
function k(prefix: string) {
  nextKey += 1
  return `${prefix}-${nextKey.toString(36)}`
}

const span = (
  text: string,
  marks: ReadonlyArray<string> = [],
): {
  _type: 'span'
  _key: string
  text: string
  marks: ReadonlyArray<string>
} => ({
  _type: 'span',
  _key: k('s'),
  text,
  marks,
})

type Span = ReturnType<typeof span>

const block = (options: {
  style?: string
  listItem?: string
  level?: number
  children: ReadonlyArray<Span>
}): PortableTextBlock =>
  ({
    _type: 'block',
    _key: k('b'),
    style: options.style ?? 'normal',
    listItem: options.listItem,
    level: options.level,
    markDefs: [],
    children: options.children,
  }) as PortableTextBlock

const para = (children: ReadonlyArray<Span>) => block({children})
const h1 = (text: string) => block({style: 'h1', children: [span(text)]})
const h3 = (text: string) => block({style: 'h3', children: [span(text)]})
const bullet = (children: ReadonlyArray<Span>) =>
  block({listItem: 'bullet', level: 1, children})
const numbered = (children: ReadonlyArray<Span>) =>
  block({listItem: 'number', level: 1, children})

const callout = (
  tone: 'note' | 'tip' | 'important' | 'warning' | 'caution',
  content: ReadonlyArray<PortableTextBlock>,
): PortableTextBlock =>
  ({
    _type: 'callout',
    _key: k('c'),
    tone,
    content,
  }) as unknown as PortableTextBlock

const codeBlock = (
  language: string,
  lines: ReadonlyArray<string>,
): PortableTextBlock =>
  ({
    _type: 'code-block',
    _key: k('cb'),
    language,
    lines: lines.map((line) => ({
      _type: 'block',
      _key: k('cl'),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: k('cs'),
          text: line,
          marks: [],
        },
      ],
    })),
  }) as unknown as PortableTextBlock

const cell = (content: ReadonlyArray<PortableTextBlock>) =>
  ({
    _type: 'cell',
    _key: k('cell'),
    content,
  }) as const

const row = (cells: ReadonlyArray<ReturnType<typeof cell>>) =>
  ({
    _type: 'row',
    _key: k('row'),
    cells,
  }) as const

const table = (
  headerRows: number,
  rows: ReadonlyArray<ReturnType<typeof row>>,
): PortableTextBlock =>
  ({
    _type: 'table',
    _key: k('table'),
    headerRows,
    rows,
  }) as unknown as PortableTextBlock

const slide = (
  key: string,
  content: ReadonlyArray<PortableTextBlock>,
): PortableTextBlock =>
  ({
    _type: 'slide',
    _key: key,
    content,
  }) as unknown as PortableTextBlock

const cellText = (text: string) => cell([para([span(text)])])

export const deckValue: ReadonlyArray<PortableTextBlock> = [
  // -------------------------------------------------------------------
  slide('slide-intro', [
    h1('Portable Text v7'),
    h3('The architecture, told as milestones.'),
    para([
      span(
        'Each slide marks a turn in how the editor came to be what it is today. ',
      ),
      span('Cmd/Ctrl + Arrow to advance.', ['em']),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-1', [
    h1('1. We vendored Slate'),
    h3('From a generic editor to one we own.'),
    para([
      span(
        'Slate had become a liability. Generic types, upstream pace, browser quirks - every fix turned into archaeology. So we copied it into the repo. Every component, every operation, every plugin. Then we started cutting.',
      ),
    ]),
    callout('note', [
      para([
        span('What it unlocked: ', ['strong']),
        span(
          'the right to delete, the right to rename, the right to say "this is PTE" without disclaimers. Everything downstream is only possible because we stopped translating.',
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-2', [
    h1('2. Portable Text-native'),
    h3('Stop pretending. The tree already was the value.'),
    para([
      span(
        'The vendored Slate tree was Portable Text values in disguise. Generic ',
      ),
      span('Element', ['code']),
      span(' and '),
      span('Text', ['code']),
      span(' became '),
      span('PortableTextTextBlock', ['code']),
      span(' and '),
      span('PortableTextSpan', ['code']),
      span(
        '. The vocabulary aligned. Operations got renamed. Helpers got renamed.',
      ),
    ]),
    callout('tip', [
      para([
        span(
          'A consumer reading the source now sees the same words they see in the schema. No translation in the head, no translation on the wire.',
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-3', [
    h1('3. Fully patch-compliant'),
    h3('The big one.'),
    para([
      span(
        'Pre-v7 the editor spoke Slate operations internally and translated them to Sanity patches on the way out. Translation went two ways and lost information both directions. Hundreds of lines. The source of an unreasonable share of bugs.',
      ),
    ]),
    para([span('We converged the layers:')]),
    table(1, [
      row([
        cellText('Operation'),
        cellText('Sanity patch'),
        cellText('Status'),
      ]),
      row([
        cell([para([span('insert', ['code'])])]),
        cell([para([span('insert', ['code'])])]),
        cellText('Pass-through'),
      ]),
      row([
        cell([para([span('unset', ['code'])])]),
        cell([para([span('unset', ['code'])])]),
        cellText('Pass-through'),
      ]),
      row([
        cell([para([span('set', ['code'])])]),
        cell([para([span('set', ['code'])])]),
        cellText('Pass-through'),
      ]),
      row([
        cell([para([span('insert.text', ['code'])])]),
        cell([para([span('diffMatchPatch', ['code'])])]),
        cellText('1:1 mapping'),
      ]),
    ]),
    callout('important', [
      para([
        span(
          'We accept any patch and emit any patch. The lowest level of the editor is patch-compliant by construction.',
          ['strong'],
        ),
      ]),
      para([
        span('If you remember one milestone from this release, this is it.'),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-4', [
    h1('4. Keyed paths'),
    h3('Numeric indexes out. Keys in.'),
    para([
      span(
        'The internal selection format was [blockIndex, childIndex] - numeric, positional, fragile. Every concurrent edit invalidated every other client. We rewrote selection, operations, dirty paths, and traversal to use keyed paths natively.',
      ),
    ]),
    para([span('Before:')]),
    codeBlock('json', [
      '// Selection — indexed',
      '{',
      '  "anchor": {"path": [3, 0], "offset": 4},',
      '  "focus":  {"path": [3, 0], "offset": 4}',
      '}',
    ]),
    para([span('After:')]),
    codeBlock('json', [
      '// Selection — keyed all the way down',
      '{',
      '  "anchor": {"path": [{"_key":"b1"}, "children", {"_key":"s1"}], "offset": 4},',
      '  "focus":  {"path": [{"_key":"b1"}, "children", {"_key":"s1"}], "offset": 4}',
      '}',
    ]),
    bullet([
      span(
        'Concurrent editing — two clients on the same _key see the same selection.',
      ),
    ]),
    bullet([span('Container support — paths are keyed at any depth.')]),
    bullet([span('Wire format and internal format share one path type.')]),
    bullet([
      span('Undo through structural mutations — blocks move, keys do not.'),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-5', [
    h1('5. Containers'),
    h3('Nested editable structures, first-class.'),
    para([
      span(
        'Pre-v7 the editor knew two levels of depth: blocks and their children. Tables, code blocks, callouts - none of them representable. The first design was scope-grammar-based; JSONPath-style strings matching positions. It worked. We deleted it.',
      ),
    ]),
    para([span('v2 is type-keyed:')]),
    codeBlock('typescript', [
      'const calloutContainer = defineContainer({',
      "  type: 'callout',",
      "  childField: 'content',",
      '  render: ({attributes, children}) => (',
      '    <aside {...attributes}>{children}</aside>',
      '  ),',
      "  of: [defineTextBlock({type: 'block', render: ...})],",
      '})',
    ]),
    callout('important', [
      para([
        span('The locked rule: ', ['strong']),
        span('registration is type-keyed, activation is position-gated.'),
      ]),
    ]),
    para([
      span(
        'This slide is a slide container. The table on slide 3, the code block above, this callout - each one is a registered container in the same single Portable Text document. Tables, code blocks, callouts, fact-boxes, nested lists. Any consumer-defined nested structure works.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-reveal', [
    h1('By the way…'),
    h3('This deck is one Portable Text document.'),
    para([
      span(
        'Every slide you have seen so far is a `slide` container at the root of a single PTE value. I am typing into it right now.',
      ),
    ]),
    callout('tip', [
      para([
        span(
          'Open the value inspector (the ⟨/⟩ button in the bottom bar). Click into any slide and start typing. Watch the value update.',
        ),
      ]),
      para([span('It is just Portable Text.', ['em'])]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-6', [
    h1('6. Cascading normalization'),
    h3('A bare type, made cursor-ready.'),
    para([
      span(
        'Slate normalization assumed flat. Containers broke every assumption. We rewrote it to cascade.',
      ),
    ]),
    para([span('An empty container with a missing field:')]),
    codeBlock('typescript', [
      "{_type: 'table'}",
      '',
      '// becomes…',
      '',
      "{_type: 'table', _key: 't1', rows: [",
      "  {_type: 'row', _key: 'r1', cells: [",
      "    {_type: 'cell', _key: 'c1', content: [",
      "      {_type: 'block', _key: 'b1', children: [",
      "        {_type: 'span', _key: 's1', text: '', marks: []}",
      '      ]}',
      '    ]}',
      '  ]}',
      ']}',
    ]),
    callout('note', [
      para([
        span(
          'Press Backspace in an empty cell — the cell stays (it is structural). Press Backspace in the only line of a code block — the code block disappears. The complexity is internal; the surface is calm.',
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-7', [
    h1('7. Depth-agnostic traversal'),
    h3('A library of composable primitives.'),
    para([
      span(
        'A hundred-plus traversal utilities existed pre-v7, most baking in path[0] or path.slice(0, 2). Each one had to be rewritten to compose primitives that work at any depth.',
      ),
    ]),
    para([span('We unified the input shape:')]),
    codeBlock('typescript', [
      'export type TraversalSnapshot = {',
      '  context: {',
      '    schema: EditorSchema',
      '    containers: ReadonlyMap<string, RegisteredContainer>',
      '    value: PortableTextValue',
      '    selection: EditorSelection',
      '  }',
      '  blockIndexMap: Map<string, number>',
      '}',
      '',
      '// Satisfied by EditorSnapshot, OperationSnapshot,',
      '// and the editor itself (via a `context` getter).',
    ]),
    callout('tip', [
      para([
        span(
          'Behaviors written for root-level text drop into a callout, a table cell, a code block — without rewriting. Many v6 plugins migrated with zero source changes.',
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-8', [
    h1('8. A cleaner DOM'),
    h3('data-pt-path, everywhere it matters.'),
    para([
      span(
        "Slate's DOM mapping had no relationship to Portable Text. data-slate-node, data-slate-leaf, data-slate-string - none of them told you which _key a node had.",
      ),
    ]),
    para([span('The new mapping is direct:')]),
    codeBlock('html', [
      '<aside data-pt-container data-pt-path="[_key==\'k1\']">',
      "  <p data-pt-leaf data-pt-path=\"[_key=='k1'].content[_key=='b1']\">",
      '    <span data-pt-path="…children[_key==\'s1\']">Hello</span>',
      '  </p>',
      '</aside>',
    ]),
    para([
      span(
        'DOM-to-model resolution walks [data-pt-path] ancestors and parses. Open devtools on a v7 editor and you see Portable Text paths in the DOM. The mapping is no longer a translation; it is a serialization.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-9', [
    h1('9. Primitive behavior events'),
    h3('Behaviors compose the primitives the engine speaks.'),
    para([
      span(
        'In v6 most behaviors raised "smart" synthetic events whose handlers contained the depth-2 assumptions. A behavior could not reach below the synthetic layer. In v7 we promoted the apply-layer primitives as ',
      ),
      span('@alpha', ['code']),
      span(' behavior events:'),
    ]),
    codeBlock('typescript', [
      'defineBehavior({',
      "  on: 'keyboard.keydown',",
      '  guard: ({event, snapshot}) => {',
      "    if (event.originEvent.key !== 'Backspace') return false",
      "    const cell = selectors.getFocusContainer(snapshot, {type: 'cell'})",
      '    if (!cell || !isCellEmpty(cell)) return false',
      '    return {cellPath: cell.path}',
      '  },',
      '  actions: [',
      '    (_, {cellPath}) => [',
      "      raise({type: 'unset', at: cellPath, paths: [['content']]}),",
      "      raise({type: 'select', at: cellPath}),",
      '    ],',
      '  ],',
      '})',
    ]),
    table(1, [
      row([cellText('Event'), cellText('Sanity patch')]),
      row([
        cell([para([span('insert', ['code'])])]),
        cell([para([span('insert', ['code'])])]),
      ]),
      row([
        cell([para([span('unset', ['code'])])]),
        cell([para([span('unset', ['code'])])]),
      ]),
      row([
        cell([para([span('set', ['code'])])]),
        cell([para([span('set', ['code'])])]),
      ]),
      row([
        cell([para([span('insert.text', ['code'])])]),
        cell([para([span('diffMatchPatch', ['code'])])]),
      ]),
      row([
        cell([para([span('remove.text', ['code'])])]),
        cell([para([span('diffMatchPatch', ['code'])])]),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-10', [
    h1('10. Schema enforcement, symmetric'),
    h3('Strict at every depth.'),
    para([
      span(
        'Pre-v7 the editor enforced schema constraints inside containers, but accepted anything at root. Consumers wrote behaviors expecting strict enforcement; got intermittent silent drops when constraints applied below root and not at it.',
      ),
    ]),
    callout('warning', [
      para([
        span('The asymmetry was a mistake. ', ['strong']),
        span(
          'v7 enforces strictly at every depth. Insert validates against the sub-schema at the target path. ',
        ),
        span('decorator.add', ['code']),
        span(' filters per-block. '),
        span('annotation.add', ['code']),
        span(' validates the annotation type.'),
      ]),
    ]),
    para([
      span(
        'A behavior that fires insert knows the editor will validate. A callout that only allows strong and em sees its constraints respected. The schema is the contract, top to bottom.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-11', [
    h1('11. The traversal snapshot'),
    h3('One input shape, everywhere.'),
    para([
      span('The type-level companion to milestone 7. '),
      span('EditorSnapshot', ['code']),
      span(', '),
      span('OperationSnapshot', ['code']),
      span(', '),
      span('TraversalSnapshot', ['code']),
      span(
        ' - all share the same shape. The editor satisfies it via a context getter.',
      ),
    ]),
    para([
      span(
        'Behaviors and selectors that read state do it the same way as the engine. 60 files migrated; the ergonomic dividend pays out forever.',
      ),
    ]),
    callout('tip', [
      para([
        span('One mental model. ', ['strong']),
        span('Three call sites. Zero adapters.'),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-arc', [
    h1('The arc'),
    h3('Every advanced feature traces back to four ideas.'),
    numbered([span('We accept any patch.')]),
    numbered([span('We emit any patch.')]),
    numbered([span('Paths are keyed.')]),
    numbered([span('Depth is just a parameter.')]),
    para([
      span(
        'A generic positional editor became a Portable Text-native, keyed, patch-compliant, depth-agnostic, container-aware document model.',
      ),
    ]),
    callout('important', [
      para([
        span('The headline of v7 is the architectural foundation. ', [
          'strong',
        ]),
        span(
          'Markdown compliance, structured lists, tables, code blocks, callouts - those are the dividend.',
        ),
      ]),
    ]),
  ]),
]

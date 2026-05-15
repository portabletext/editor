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
      span('Swipe or press Cmd/Ctrl + Arrow to advance.', ['em']),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-1', [
    h1('1. We vendored Slate'),
    h3('From a generic editor to one we own.'),
    para([
      span(
        'Bug reports kept turning into archaeology. "Caret skips a character on this keyboard." "Remote patch produces the wrong tree." "Undo restores wrong state." Each one bottomed out at the same question: ',
      ),
      span("is this our bug, or is it Slate's?", ['em']),
      span(' PRs to upstream sat for months. The generic '),
      span('Editor', ['code']),
      span(', '),
      span('Node', ['code']),
      span(', '),
      span('Path', ['code']),
      span(' types were a vocabulary we paid for and never used.'),
    ]),
    para([
      span(
        'So we copied Slate into the repo. Every component, every operation, every plugin. Then we started cutting.',
      ),
    ]),
    callout('note', [
      para([
        span('What it unlocked: ', ['strong']),
        span('the right to delete, the right to rename, the right to make '),
        span('Path', ['code']),
        span(' mean '),
        span('PortableTextPath', ['code']),
        span(
          '. The right to say "we own that code, it\'s PTE" without disclaimers.',
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
        'Once we owned the code, we could stop pretending. The vendored Slate tree was already Portable Text values in disguise. We deleted the disguise. Generic ',
      ),
      span('Element', ['code']),
      span(' and '),
      span('Text', ['code']),
      span(' became '),
      span('PortableTextTextBlock', ['code']),
      span(' and '),
      span('PortableTextSpan', ['code']),
      span('. The "Slate Editor" became '),
      span('PortableTextSlateEditor', ['code']),
      span(' with '),
      span('schema', ['code']),
      span(', '),
      span('containers', ['code']),
      span(', and '),
      span('children', ['code']),
      span(' as first-class fields.'),
    ]),
    callout('tip', [
      para([
        span(
          'A consumer reading the source now sees the same words they see in the schema. The type names in the source match the protocol on the wire.',
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
        'Pre-v7 the editor spoke Slate operations internally and translated them to Sanity patches on the way out. Translation went two ways and lost information both directions. The translation layer was the source of an unreasonable share of bugs.',
      ),
    ]),
    para([span('We converged the layers:')]),
    table(1, [
      row([
        cellText('Behavior event'),
        cellText('Slate operation'),
        cellText('Sanity patch'),
      ]),
      row([
        cell([para([span('insert', ['code'])])]),
        cell([para([span('insert', ['code'])])]),
        cell([
          para([
            span('insert', ['code']),
            span(' (+ '),
            span('setIfMissing', ['code']),
            span(' for non-root)'),
          ]),
        ]),
      ]),
      row([
        cell([para([span('insert.text', ['code'])])]),
        cell([para([span('insert_text', ['code'])])]),
        cell([para([span('diffMatchPatch', ['code'])])]),
      ]),
      row([
        cell([para([span('select', ['code'])])]),
        cell([para([span('set_selection', ['code'])])]),
        cellText('(local; selection is not a patch)'),
      ]),
    ]),
    callout('important', [
      para([
        span(
          'We accept any patch and emit any patch. The lowest level of the editor is patch-compliant by construction. ',
          ['strong'],
        ),
        span('What translation remains is two files, mostly identity.'),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-4-strict', [
    h1('4. Schema enforcement, symmetric'),
    h3('Strict at every depth.'),
    para([
      span(
        'Patches gave us strict in/out. The schema gave us strict top/bottom. Pre-v7 the editor enforced constraints inside containers but accepted anything at root. Consumers wrote behaviors expecting strict enforcement and got intermittent silent drops.',
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
        'The schema is the contract, top to bottom. A behavior that fires insert knows the editor will validate.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-5-keyed', [
    h1('5. Keyed paths'),
    h3('Numeric indexes out. Keys in.'),
    para([
      span(
        'The internal selection format was [blockIndex, childIndex] - numeric, positional, fragile. Every concurrent edit invalidated every other client. We rewrote selection, operations, dirty paths, and traversal to use keyed paths natively.',
      ),
    ]),
    para([span('Before:')]),
    codeBlock('json', [
      '// Selection - indexed',
      '{',
      '  "anchor": {"path": [3, 0], "offset": 4},',
      '  "focus":  {"path": [3, 0], "offset": 4}',
      '}',
    ]),
    para([span('After:')]),
    codeBlock('json', [
      '// Selection - keyed all the way down',
      '{',
      '  "anchor": {"path": [{"_key":"b1"}, "children", {"_key":"s1"}], "offset": 4},',
      '  "focus":  {"path": [{"_key":"b1"}, "children", {"_key":"s1"}], "offset": 4}',
      '}',
    ]),
    bullet([
      span(
        'Concurrent editing - two clients on the same _key see the same selection point.',
      ),
    ]),
    bullet([span('Container support - paths are keyed at any depth.')]),
    bullet([span('Patches and operations share one path format.')]),
    bullet([
      span(
        'Undo works through structural mutations - blocks move, keys do not.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-6-containers', [
    h1('6. Containers'),
    h3('Nested editable structures, first-class.'),
    para([
      span(
        'Pre-v7 the editor knew two levels of depth: blocks and their children. Tables, code blocks, callouts - none of them representable. The first design was scope-grammar-based: JSONPath-style strings matching positions. It worked. The type-level machinery got unwieldy. We deleted it.',
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
  ]),

  // -------------------------------------------------------------------
  slide('slide-reveal', [
    h1('By the way…'),
    h3('This deck is one Portable Text document.'),
    para([
      span('Every slide you have seen so far is a '),
      span('slide', ['code']),
      span(
        ' container at the root of a single PTE value. The table on slide 3, the code block you just saw, this callout - each one is a registered container in the same document. I am typing into it right now.',
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
  slide('slide-7-cascade', [
    h1('7. Cascading normalization'),
    h3('A bare type, made cursor-ready.'),
    para([
      span(
        "Slate's normalization assumed flat - blocks at root, children inside blocks, nothing deeper. Containers broke every assumption. We rewrote it to cascade.",
      ),
    ]),
    para([span('A bare container with no fields:')]),
    codeBlock('typescript', [
      "{_type: 'table'}",
      '',
      '// becomes, in one cascade pass:',
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
          'Press Backspace in an empty cell - the cell stays (it is structural). Press Backspace in the only line of a code block - the code block disappears. The complexity is internal; the surface is calm.',
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-8-traversal', [
    h1('8. Depth-agnostic traversal'),
    h3('A library of composable primitives.'),
    para([
      span('A hundred-plus traversal utilities existed pre-v7. Most baked in '),
      span('path[0]', ['code']),
      span(' or '),
      span('path.slice(0, 2)', ['code']),
      span(
        ' as the "block path." Each one had to be rewritten to compose primitives that work at any depth.',
      ),
    ]),
    para([span('We unified the input shape:')]),
    codeBlock('typescript', [
      'export type TraversalSnapshot = {',
      '  context: {',
      '    schema: EditorSchema',
      '    containers: Containers',
      '    value: Array<Node>',
      '  }',
      '  blockIndexMap: Map<string, number>',
      '}',
      '',
      '// Satisfied by EditorSnapshot, OperationSnapshot,',
      '// and the editor itself (via a `context` getter).',
    ]),
    para([
      span(
        'Behaviors written for root-level text drop into a callout, a table cell, a code block - without rewriting. ',
        ['strong'],
      ),
      span('Many v6 plugins migrated with zero source changes.'),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-9-dom', [
    h1('9. A cleaner DOM'),
    h3('data-pt-path, everywhere it matters.'),
    para([
      span("Slate's DOM mapping had no relationship to Portable Text. "),
      span('data-slate-node', ['code']),
      span(', '),
      span('data-slate-leaf', ['code']),
      span(', '),
      span('data-slate-string', ['code']),
      span(
        ' - none of them told you which _key a node had, which path it lived at, which container it was inside.',
      ),
    ]),
    para([span('The new mapping is direct:')]),
    codeBlock('html', [
      '<td data-pt-block-type="container"',
      "    data-pt-path=\"[_key=='slide-3'].content[_key=='table-2l'].rows[_key=='row-1g'].cells[_key=='cell-19']\">",
      '  <p data-pt-block-type="text"',
      "     data-pt-path=\"...cells[_key=='cell-19'].content[_key=='b-18']\">",
      '    <span data-pt-child-type="span" data-pt-path="...content[_key==\'b-18\'].children[_key==\'s-17\']">',
      '      <span data-pt-mark="true">',
      '        <span data-pt-string="true">Operation</span>',
      '      </span>',
      '    </span>',
      '  </p>',
      '</td>',
    ]),
    para([
      span(
        'DOM-to-model resolution walks [data-pt-path] ancestors and parses. Open devtools on a v7 editor and you see Portable Text paths in the DOM. The mapping is no longer a translation; it is a serialization.',
      ),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-10-primitives', [
    h1('10. Primitive behavior events'),
    h3('Behaviors compose the primitives the engine speaks.'),
    para([
      span(
        'In v6 most behaviors raised "smart" synthetic events whose handlers baked in depth-2 assumptions. A behavior could not reach below the synthetic layer. In v7 the apply-layer primitives ship as ',
      ),
      span('@alpha', ['code']),
      span(' behavior events: '),
      span('insert', ['code']),
      span(', '),
      span('insert.text', ['code']),
      span(', '),
      span('remove.text', ['code']),
      span(', '),
      span('set', ['code']),
      span(', '),
      span('unset', ['code']),
      span(', '),
      span('select', ['code']),
      span('. Six events, one per apply-layer operation, one per patch type.'),
    ]),
    codeBlock('typescript', [
      '// Backspace in an empty cell: clear the cell, keep the structure.',
      'defineBehavior({',
      "  on: 'keyboard.keydown',",
      '  guard: backspaceInEmptyCell,',
      '  actions: [',
      '    (_, {cellPath}) => [',
      "      raise({type: 'unset', at: [...cellPath, 'content']}),",
      "      raise({type: 'select', at: cellPath}),",
      '    ],',
      '  ],',
      '})',
    ]),
    callout('note', [
      para([
        span(
          "The plugin's source becomes a thin translator between user intent and the editor's primitive vocabulary. This is what behaviors were always supposed to be.",
        ),
      ]),
    ]),
  ]),

  // -------------------------------------------------------------------
  slide('slide-arc', [
    h1('Everything else is dividend.'),
    h3('Every advanced feature traces back to four ideas.'),
    numbered([span('We accept any patch.')]),
    numbered([span('We emit any patch.')]),
    numbered([span('Paths are keyed.')]),
    numbered([span('Depth is just a parameter.')]),
    para([
      span(
        'A generic positional editor became a Portable Text-native, keyed, patch-compliant, depth-agnostic, container-aware document model. ',
      ),
      span(
        'One snapshot shape satisfies the engine, the operations layer, the traversal utilities, and every selector consumers write.',
      ),
    ]),
    callout('important', [
      para([
        span(
          'Markdown compliance, structured lists, tables, code blocks, callouts, fact-boxes, nested lists - the consumer-visible features are the dividend.',
        ),
      ]),
    ]),
  ]),
]

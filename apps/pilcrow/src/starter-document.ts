import type {PortableTextBlock} from '@portabletext/editor'

/**
 * M0 starter document.
 *
 * Hand-converted from `/specs/pilcrow-starter-doc.md` to PT JSON.
 * Image `title` is set directly here; M1 round-trip work picks up
 * inferring `title` from markdown title attributes.
 *
 * Every block type from §6.1 is represented once. Keys are stable so
 * React reconciliation is happy across hot-reloads.
 */

let keyCounter = 0
function k(prefix: string): string {
  keyCounter += 1
  return `${prefix}-${keyCounter}`
}

function span(text: string, marks: Array<string> = []) {
  return {_type: 'span', _key: k('s'), text, marks}
}

function block(
  style: string,
  children: Array<{
    _type: string
    _key: string
    text?: string
    marks?: Array<string>
  }>,
  markDefs: Array<{
    _type: string
    _key: string
    href?: string
    title?: string
  }> = [],
) {
  return {
    _type: 'block',
    _key: k('b'),
    style,
    markDefs,
    children,
  }
}

function paragraph(text: string) {
  return block('normal', [span(text)])
}

function heading(level: 1 | 2 | 3 | 4 | 5 | 6, text: string) {
  return block(`h${level}`, [span(text)])
}

function codeLine(text: string) {
  return {
    _type: 'block',
    _key: k('cb'),
    style: 'normal',
    markDefs: [],
    children: [span(text)],
  }
}

function listItem(content: Array<unknown>, checked?: boolean) {
  return {
    _type: 'list-item',
    _key: k('li'),
    ...(checked !== undefined ? {checked} : {}),
    content,
  }
}

function cell(text: string) {
  return {
    _type: 'cell',
    _key: k('c'),
    content: [paragraph(text)],
  }
}

function row(cells: Array<ReturnType<typeof cell>>) {
  return {_type: 'row', _key: k('r'), cells}
}

export const starterDocument: Array<PortableTextBlock> = [
  // # Pilcrow — what it is, where it's going
  heading(1, "Pilcrow — what it is, where it's going"),

  paragraph(
    "This is the starter document loaded on first open. It demonstrates every block type pilcrow handles, written as a real document rather than a feature dump. Edit it, delete it, save your own — the point is to show what's possible.",
  ),

  // ## Why this exists
  heading(2, 'Why this exists'),

  paragraph(
    'Pilcrow is a Markdown editor for people who write a lot of Markdown and want it to feel like writing, not like driving a feature checklist. Three principles shaped the work:',
  ),

  // Bullet list — three items with bold lead-ins
  {
    _type: 'list',
    _key: k('list'),
    kind: 'bullet',
    items: [
      listItem([
        block('normal', [
          span('The text is the surface.', ['strong']),
          span(
            ' No persistent toolbar. No formatting bar competing for attention. The page is a page.',
          ),
        ]),
      ]),
      listItem([
        block('normal', [
          span('Markdown round-trips cleanly both directions.', ['strong']),
          span(
            ' Paste any Markdown, the editor renders it. Copy any range, valid Markdown lands on your clipboard. No silent mutations — what you type is what survives.',
          ),
        ]),
      ]),
      listItem([
        block('normal', [
          span('Smart behavior is opt-in via interaction.', ['strong']),
          span(
            ' Slash to insert, drag to move, hover to reveal — but never visible until you reach for it.',
          ),
        ]),
      ]),
    ],
  },

  paragraph("If you want to see how a callout looks, here's one:"),

  // Callout (note)
  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'note',
    content: [
      block('normal', [
        span('Pilcrow is built on the Portable Text Editor. The schema is '),
        span('what Markdown can express', ['em']),
        span(', scoped to what '),
        span('@portabletext/markdown', ['code']),
        span(' round-trips today. Nothing more, nothing less.'),
      ]),
    ],
  },

  paragraph('And a tip:'),

  // Callout (tip)
  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'tip',
    content: [
      block('normal', [
        span("Hover any paragraph and you'll see a faint "),
        span('¶', ['strong']),
        span(
          " appear in the left margin. That's pilcrow's namesake — the paragraph mark — doing exactly what it was invented to do in the 11th century.",
        ),
      ]),
    ],
  },

  // ## What works
  heading(2, 'What works'),

  // ### Headings, all six levels
  heading(3, 'Headings, all six levels'),

  heading(1, 'Heading one'),
  heading(2, 'Heading two'),
  heading(3, 'Heading three'),
  heading(4, 'Heading four'),
  heading(5, 'Heading five'),
  heading(6, 'Heading six'),

  paragraph(
    'Use them as outline scaffolding. The editor renders them with a serif face (Crimson Pro) and respects vertical rhythm.',
  ),

  // ### Lists — bullet, ordered, task
  heading(3, 'Lists — bullet, ordered, task'),

  paragraph('A bullet list:'),

  {
    _type: 'list',
    _key: k('list'),
    kind: 'bullet',
    items: [
      listItem([
        paragraph('Pairing on the engine work paid off in unexpected ways'),
      ]),
      listItem([
        paragraph(
          'The falsifier-discipline pass cut three speculative branches before they shipped',
        ),
      ]),
      listItem([paragraph('Removing scopes was a bigger win than expected')]),
    ],
  },

  paragraph('An ordered list:'),

  {
    _type: 'list',
    _key: k('list'),
    kind: 'number',
    items: [
      listItem([paragraph('Settle the schema')]),
      listItem([paragraph('Wire the renderers')]),
      listItem([paragraph('Add the smart behaviors')]),
      listItem([paragraph('Ship')]),
    ],
  },

  paragraph('A task list:'),

  {
    _type: 'list',
    _key: k('list'),
    kind: 'task',
    items: [
      listItem([paragraph('Container API v2 lands on main')], true),
      listItem([paragraph('Pilcrow rebased onto v2')], true),
      listItem([paragraph('Schema reconciled')], true),
      listItem(
        [paragraph('Round-trip fixes in @portabletext/markdown')],
        false,
      ),
      listItem(
        [paragraph('M1 — bubble menu, paste handling, basic UX')],
        false,
      ),
    ],
  },

  paragraph('Nested lists work too:'),

  // Nested list — outer with inner
  {
    _type: 'list',
    _key: k('list'),
    kind: 'bullet',
    items: [
      listItem([
        paragraph('Outer item'),
        {
          _type: 'list',
          _key: k('list'),
          kind: 'bullet',
          items: [
            listItem([
              block('normal', [
                span('Inner item with '),
                span('bold', ['strong']),
              ]),
            ]),
            listItem([
              block('normal', [
                span('Inner item with '),
                span('italic', ['em']),
              ]),
              {
                _type: 'list',
                _key: k('list'),
                kind: 'bullet',
                items: [
                  listItem([paragraph('Three levels deep, because we can')]),
                ],
              },
            ]),
          ],
        },
      ]),
      listItem([paragraph('Back to the outer level')]),
    ],
  },

  // ### Inline emphasis
  heading(3, 'Inline emphasis'),

  block('normal', [
    span('Words can be '),
    span('bold', ['strong']),
    span(', '),
    span('italic', ['em']),
    span(', '),
    span('struck through', ['strike-through']),
    span(', or rendered as '),
    span('inline code', ['code']),
    span('. Combine them: '),
    span('bold italic', ['strong', 'em']),
    span(', '),
    span('everything', ['strong', 'em', 'strike-through']),
    span(', or just plain prose.'),
  ]),

  // Link with title
  (() => {
    const linkKey = k('mk')
    return block(
      'normal',
      [
        span('Links carry titles when you give them one: '),
        span('the portabletext spec', [linkKey]),
        span(
          ' — hover to see the tooltip. Bare URLs survive as bare URLs after ',
        ),
        span('@portabletext/markdown', ['code']),
        span("'s round-trip fixes land."),
      ],
      [
        {
          _type: 'link',
          _key: linkKey,
          href: 'https://github.com/portabletext/portabletext',
          title: 'Portable Text Specification',
        },
      ],
    )
  })(),

  // ### Blockquotes, including recursive
  heading(3, 'Blockquotes, including recursive'),

  {
    _type: 'blockquote',
    _key: k('bq'),
    content: [paragraph('Removing code is more powerful than adding code.')],
  },

  {
    _type: 'blockquote',
    _key: k('bq'),
    content: [
      {
        _type: 'blockquote',
        _key: k('bq'),
        content: [
          paragraph('Even when removing code feels harder than adding it.'),
        ],
      },
    ],
  },

  {
    _type: 'blockquote',
    _key: k('bq'),
    content: [
      {
        _type: 'blockquote',
        _key: k('bq'),
        content: [
          {
            _type: 'blockquote',
            _key: k('bq'),
            content: [paragraph('Especially then.')],
          },
        ],
      },
    ],
  },

  // ### Code with language tag
  heading(3, 'Code, with a language tag'),

  {
    _type: 'code-block',
    _key: k('code'),
    language: 'typescript',
    lines: [
      codeLine('function review(claim: Claim): Verdict {'),
      codeLine('  const falsifier = preCommit(claim)'),
      codeLine('  return measure(falsifier)'),
      codeLine('}'),
    ],
  },

  paragraph('And without:'),

  {
    _type: 'code-block',
    _key: k('code'),
    lines: [
      codeLine('plain text'),
      codeLine('no language tag'),
      codeLine('still renders cleanly'),
    ],
  },

  // ### Tables
  heading(3, 'Tables'),

  {
    _type: 'table',
    _key: k('tab'),
    headerRows: 1,
    rows: [
      row([cell('Quarter'), cell('Wins'), cell('Open questions')]),
      row([cell('Q1'), cell('Falsifier discipline'), cell('Corpus shape')]),
      row([cell('Q2'), cell('Container schema landed'), cell('Frontmatter')]),
      row([cell('Q3'), cell('Round-trip hardening'), cell('Mermaid registry')]),
    ],
  },

  paragraph('Three alignments shown above — left, default, right.'),

  // ### Callouts — all five tones
  heading(3, 'Callouts, all five tones'),

  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'note',
    content: [
      paragraph("Use for general information that doesn't fit the prose flow."),
    ],
  },

  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'tip',
    content: [
      paragraph(
        'Use sparingly. Tips lose meaning when they show up every paragraph.',
      ),
    ],
  },

  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'important',
    content: [paragraph('For things readers must not miss.')],
  },

  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'warning',
    content: [paragraph('For consequences. "If you do X, Y happens."')],
  },

  {
    _type: 'callout',
    _key: k('cl'),
    tone: 'caution',
    content: [paragraph('For destructive or irreversible operations.')],
  },

  // ### Images
  heading(3, 'Images'),

  {
    _type: 'image',
    _key: k('img'),
    src: 'https://placehold.co/600x200/fbf7ee/1c1c1c?text=¶',
    alt: 'A pilcrow mark in serif',
    title: 'The paragraph mark — the namesake',
  },

  paragraph(
    "Title attribute survives round-trip when the underlying matcher reads it. Pilcrow's schema declares title on images; the matcher fix lands in the @portabletext/markdown PR.",
  ),

  // ### Horizontal rules
  heading(3, 'Horizontal rules'),

  paragraph('Above the line.'),

  {_type: 'horizontal-rule', _key: k('hr')},

  paragraph('Below the line.'),

  // ## Where things go from here
  heading(2, 'Where things go from here'),

  block('normal', [
    span(
      'Three years into the Portable Text Editor and pilcrow finally feels like itself — ',
    ),
    span('understated, fast, the type doing the work', ['em']),
    span('.'),
  ]),

  paragraph(
    "The next milestones add behavior. The current one (M0) just gets you a working editor with all the block types rendered correctly. No slash menu. No markdown shortcuts (# doesn't auto-promote yet). No syntax highlighting. No undo plugin beyond what the engine ships by default. Save and load are also off — refresh the page and you lose your work.",
  ),

  paragraph(
    "That's deliberate. The point of M0 is can you type into every block, and does it render correctly. If yes, M1 starts. If no, fix the bug, don't add features.",
  ),

  paragraph(
    "Edit this document, delete it, write your own. The editor doesn't care.",
  ),
] as Array<PortableTextBlock>

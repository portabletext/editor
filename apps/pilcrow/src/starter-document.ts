import type {PortableTextBlock} from '@portabletext/editor'

/**
 * Starter document. Showcases the basic constructs that exist today;
 * grows as each per-construct plugin lands. Phase 2 introduces a
 * code-block, image, and horizontal-rule alongside the text content.
 */
export const starterDocument: Array<PortableTextBlock> = [
  {
    _type: 'block',
    _key: 'b-title',
    style: 'h1',
    children: [{_type: 'span', _key: 's-title', text: 'Pilcrow', marks: []}],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b-tag',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-tag',
        text: 'A writing surface for portable text.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'horizontal-rule',
    _key: 'hr-1',
  },
  {
    _type: 'block',
    _key: 'b-body',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-body-a',
        text: 'Write here. The source pane shows the markdown representation, and ',
        marks: [],
      },
      {
        _type: 'span',
        _key: 's-body-b',
        text: 'editing the markdown there reflects back into the editor',
        marks: ['em'],
      },
      {
        _type: 'span',
        _key: 's-body-c',
        text: ' via patches so node identities survive.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b-code-intro',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-code-intro',
        text: 'Code blocks render with a thin left rule and a language label:',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'code-block',
    _key: 'cb-1',
    language: 'typescript',
    lines: [
      {
        _type: 'block',
        _key: 'cb-1-l1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'cb-1-l1-s',
            text: "import {EditorProvider} from '@portabletext/editor'",
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'cb-1-l2',
        style: 'normal',
        children: [{_type: 'span', _key: 'cb-1-l2-s', text: '', marks: []}],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'cb-1-l3',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'cb-1-l3-s',
            text: 'export function Editor() {',
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'cb-1-l4',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'cb-1-l4-s',
            text: '  return <EditorProvider />',
            marks: [],
          },
        ],
        markDefs: [],
      },
      {
        _type: 'block',
        _key: 'cb-1-l5',
        style: 'normal',
        children: [{_type: 'span', _key: 'cb-1-l5-s', text: '}', marks: []}],
        markDefs: [],
      },
    ],
  },
  {
    _type: 'callout',
    _key: 'callout-note',
    tone: 'note',
    content: [
      {
        _type: 'block',
        _key: 'callout-note-b1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'callout-note-b1-s',
            text: 'Callouts come in four tones: note, tip, warning, caution.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _type: 'callout',
    _key: 'callout-warn',
    tone: 'warning',
    content: [
      {
        _type: 'block',
        _key: 'callout-warn-b1',
        style: 'normal',
        children: [
          {
            _type: 'span',
            _key: 'callout-warn-b1-s',
            text: 'Variants are distinguished by glyph and label, not color, so the grayscale palette stays intact.',
            marks: [],
          },
        ],
        markDefs: [],
      },
    ],
  },
  {
    _type: 'table',
    _key: 't-1',
    headerRows: 1,
    rows: [
      {
        _type: 'row',
        _key: 't-1-r1',
        cells: [
          {
            _type: 'cell',
            _key: 't-1-r1-c1',
            content: [
              {
                _type: 'block',
                _key: 't-1-r1-c1-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r1-c1-s',
                    text: 'Construct',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'cell',
            _key: 't-1-r1-c2',
            content: [
              {
                _type: 'block',
                _key: 't-1-r1-c2-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r1-c2-s',
                    text: 'Visual',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'row',
        _key: 't-1-r2',
        cells: [
          {
            _type: 'cell',
            _key: 't-1-r2-c1',
            content: [
              {
                _type: 'block',
                _key: 't-1-r2-c1-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r2-c1-s',
                    text: 'Code block',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'cell',
            _key: 't-1-r2-c2',
            content: [
              {
                _type: 'block',
                _key: 't-1-r2-c2-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r2-c2-s',
                    text: 'Monospace, left rule, language label',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'row',
        _key: 't-1-r3',
        cells: [
          {
            _type: 'cell',
            _key: 't-1-r3-c1',
            content: [
              {
                _type: 'block',
                _key: 't-1-r3-c1-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r3-c1-s',
                    text: 'Callout',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
          {
            _type: 'cell',
            _key: 't-1-r3-c2',
            content: [
              {
                _type: 'block',
                _key: 't-1-r3-c2-b',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 't-1-r3-c2-s',
                    text: 'Indent, glyph, label, body',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'b-lists-intro',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-lists-intro',
        text: 'Lists are containers. Bullets, numbered lists, and task lists share the same shape:',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'list',
    _key: 'l-bullet',
    kind: 'bullet',
    items: [
      {
        _type: 'list-item',
        _key: 'l-bullet-i1',
        content: [
          {
            _type: 'block',
            _key: 'l-bullet-i1-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-bullet-i1-s',
                text: 'Nested lists hold lists as siblings of text blocks',
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: 'list',
            _key: 'l-bullet-i1-nested',
            kind: 'bullet',
            items: [
              {
                _type: 'list-item',
                _key: 'l-bullet-i1-nested-i1',
                content: [
                  {
                    _type: 'block',
                    _key: 'l-bullet-i1-nested-i1-b',
                    style: 'normal',
                    children: [
                      {
                        _type: 'span',
                        _key: 'l-bullet-i1-nested-i1-s',
                        text: 'Tab sinks, Shift+Tab lifts',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                  },
                ],
              },
              {
                _type: 'list-item',
                _key: 'l-bullet-i1-nested-i2',
                content: [
                  {
                    _type: 'block',
                    _key: 'l-bullet-i1-nested-i2-b',
                    style: 'normal',
                    children: [
                      {
                        _type: 'span',
                        _key: 'l-bullet-i1-nested-i2-s',
                        text: 'Composes the unset, insert, and select primitives',
                        marks: [],
                      },
                    ],
                    markDefs: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-bullet-i2',
        content: [
          {
            _type: 'block',
            _key: 'l-bullet-i2-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-bullet-i2-s',
                text: 'Selection tracks through structural moves via a rebaseFocus helper',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'b-rich-list-intro',
    style: 'h2',
    children: [
      {
        _type: 'span',
        _key: 's-rich-list-intro',
        text: 'Anything can live in a list item',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'block',
    _key: 'b-rich-list-body',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-rich-list-body',
        text: 'Because the list-item content array accepts the same block types as the document itself, you can mix prose with images and code blocks.',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'list',
    _key: 'l-rich',
    kind: 'bullet',
    items: [
      {
        _type: 'list-item',
        _key: 'l-rich-i1',
        content: [
          {
            _type: 'block',
            _key: 'l-rich-i1-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-rich-i1-s',
                text: 'A list item can hold an image:',
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: 'image',
            _key: 'l-rich-i1-image',
            src: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
            alt: 'A vintage typewriter on a wooden desk',
            caption: 'Typewriter, by Sergey Zolkin on Unsplash',
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-rich-i2',
        content: [
          {
            _type: 'block',
            _key: 'l-rich-i2-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-rich-i2-s',
                text: 'Or a code block:',
                marks: [],
              },
            ],
            markDefs: [],
          },
          {
            _type: 'code-block',
            _key: 'l-rich-i2-code',
            language: 'typescript',
            lines: [
              {
                _type: 'block',
                _key: 'l-rich-i2-code-l1',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 'l-rich-i2-code-l1-s',
                    text: 'const editor = useEditor()',
                    marks: [],
                  },
                ],
                markDefs: [],
              },
              {
                _type: 'block',
                _key: 'l-rich-i2-code-l2',
                style: 'normal',
                children: [
                  {
                    _type: 'span',
                    _key: 'l-rich-i2-code-l2-s',
                    text: "editor.send({type: 'focus'})",
                    marks: [],
                  },
                ],
                markDefs: [],
              },
            ],
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-rich-i3',
        content: [
          {
            _type: 'block',
            _key: 'l-rich-i3-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-rich-i3-s',
                text: 'Plain text items work the same as before.',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
    ],
  },
  {
    _type: 'list',
    _key: 'l-number',
    kind: 'number',
    items: [
      {
        _type: 'list-item',
        _key: 'l-number-i1',
        content: [
          {
            _type: 'block',
            _key: 'l-number-i1-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-number-i1-s',
                text: 'Numbered lists use the same list container with kind: number',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-number-i2',
        content: [
          {
            _type: 'block',
            _key: 'l-number-i2-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-number-i2-s',
                text: 'Same shape, different rendering',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
    ],
  },
  {
    _type: 'block',
    _key: 'b-task-intro',
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: 's-task-intro',
        text: 'Task lists are structured lists with kind: task and a checked field on the list-item:',
        marks: [],
      },
    ],
    markDefs: [],
  },
  {
    _type: 'list',
    _key: 'l-task',
    kind: 'task',
    items: [
      {
        _type: 'list-item',
        _key: 'l-task-i1',
        checked: true,
        content: [
          {
            _type: 'block',
            _key: 'l-task-i1-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-task-i1-s',
                text: 'Pick a name for the markdown editor',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-task-i2',
        checked: true,
        content: [
          {
            _type: 'block',
            _key: 'l-task-i2-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-task-i2-s',
                text: 'Ship the skeleton',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
      {
        _type: 'list-item',
        _key: 'l-task-i3',
        checked: false,
        content: [
          {
            _type: 'block',
            _key: 'l-task-i3-b',
            style: 'normal',
            children: [
              {
                _type: 'span',
                _key: 'l-task-i3-s',
                text: 'Wire markdown round-trip via diff-patch',
                marks: [],
              },
            ],
            markDefs: [],
          },
        ],
      },
    ],
  },
]

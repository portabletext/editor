import {defineContainer, useEditor, type BlockPath} from '@portabletext/editor'
import {raise} from '@portabletext/editor/behaviors'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {defineInputRule, InputRulePlugin} from '@portabletext/plugin-input-rule'
import type {schemaDefinition} from '../schema'

/**
 * Callout container. Renders as an indented block with a tone icon
 * and a thin left rule. Variants (note, warning, tip, caution) are
 * distinguished by icon shape only - no color hue - to stay within
 * the grayscale palette.
 *
 * The tone field is a string; the renderer falls back to 'note' if
 * an unknown tone is provided. Adding a new tone is a matter of
 * picking a glyph + a label and adding both maps below.
 */
const calloutContainer = defineContainer<typeof schemaDefinition>({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children, node, path}) => {
    const block = node as {tone?: string}
    const tone = (block.tone ?? 'note') as Tone
    const config = tones[tone] ?? tones.note
    return (
      <aside
        {...attributes}
        className={`pc-callout pc-callout-${tone}`}
        aria-label={`${config.label} callout`}
      >
        <header className="pc-callout-header" contentEditable={false}>
          <span className="pc-callout-glyph" aria-hidden>
            {config.glyph}
          </span>
          <ToneSelect tone={tone} path={path} />
        </header>
        <div className="pc-callout-body">{children}</div>
      </aside>
    )
  },
})

function ToneSelect(props: {tone: Tone; path: BlockPath}) {
  const editor = useEditor()
  return (
    <select
      className="pc-callout-tone-select"
      value={props.tone}
      onChange={(event) => {
        editor.send({
          type: 'set',
          at: [...props.path, 'tone'],
          value: event.target.value,
        } as never)
      }}
    >
      {(Object.keys(tones) as Array<Tone>).map((toneKey) => (
        <option key={toneKey} value={toneKey}>
          {tones[toneKey].label}
        </option>
      ))}
    </select>
  )
}

type Tone = 'note' | 'tip' | 'warning' | 'caution'

const tones: Record<Tone, {glyph: string; label: string}> = {
  note: {glyph: 'i', label: 'Note'},
  tip: {glyph: '★', label: 'Tip'},
  warning: {glyph: '!', label: 'Warning'},
  caution: {glyph: '⊘', label: 'Caution'},
}

/**
 * Callout input rule. The user types `[!NOTE]` (or any other tone)
 * at the start of a paragraph that lives directly inside a
 * blockquote container, and the enclosing blockquote becomes a
 * callout with the matched tone.
 *
 * The trigger is the closing `]` keystroke. This mirrors GitHub's
 * GFM alert syntax (`> [!NOTE]\n> body`) where the alert lives
 * inside a blockquote: typing the alert marker on the first line
 * of a quote converts the whole quote into an admonition.
 */
const tonePattern = /^\[!(note|tip|warning|caution)\]$/i

const calloutInputRule = defineInputRule({
  on: /^\[!(note|tip|warning|caution)\]$/i,
  guard: ({event, snapshot}) => {
    const focusBlockPath = event.focusBlock.path
    // Require an enclosing blockquote: the focus block's parent path
    // must point at a blockquote container's `content` field. The
    // parent path is the focus block's path with its last segment
    // (the keyed child reference) removed, then the segment before
    // that is the blockquote's `{_key}` reference and the one before
    // is the field name `'content'`.
    if (focusBlockPath.length < 3) {
      return false
    }
    const grandparentSegment = focusBlockPath.at(-3)
    const fieldSegment = focusBlockPath.at(-2)
    if (
      typeof grandparentSegment !== 'object' ||
      grandparentSegment === null ||
      !('_key' in grandparentSegment) ||
      fieldSegment !== 'content'
    ) {
      return false
    }
    const blockquotePath = focusBlockPath.slice(0, -2)
    const blockquoteNode = snapshot.context.value.find(
      (block) =>
        typeof block === 'object' &&
        block !== null &&
        '_key' in block &&
        block._key === grandparentSegment._key,
    ) as {_type?: string} | undefined
    if (!blockquoteNode || blockquoteNode._type !== 'blockquote') {
      return false
    }
    const match = event.matches.at(0)
    if (!match) {
      return false
    }
    const toneMatch = match.text.match(tonePattern)
    if (!toneMatch || !toneMatch[1]) {
      return false
    }
    const keyGen = snapshot.context.keyGenerator
    const tone = toneMatch[1].toLowerCase() as Tone
    return {tone, keyGen, blockquotePath}
  },
  actions: [
    (_, {tone, keyGen, blockquotePath}) => {
      const blockKey = keyGen()
      const spanKey = keyGen()
      const calloutKey = keyGen()

      const callout = {
        _type: 'callout',
        _key: calloutKey,
        tone,
        content: [
          {
            _type: 'block',
            _key: blockKey,
            style: 'normal',
            children: [{_type: 'span', _key: spanKey, text: '', marks: []}],
            markDefs: [],
          },
        ],
      }

      const blockquoteParentPath = blockquotePath.slice(0, -1)
      const newCaretPath = [
        ...blockquoteParentPath,
        {_key: calloutKey},
        'content',
        {_key: blockKey},
        'children',
        {_key: spanKey},
      ]

      return [
        raise({
          type: 'insert',
          at: blockquotePath,
          value: callout as never,
          position: 'before',
        }),
        raise({type: 'unset', at: blockquotePath}),
        raise({
          type: 'select',
          at: {
            anchor: {path: newCaretPath, offset: 0},
            focus: {path: newCaretPath, offset: 0},
          } as never,
        }),
      ]
    },
  ],
})

export function CalloutPlugin() {
  return (
    <>
      <ContainerPlugin containers={[calloutContainer]} />
      <InputRulePlugin rules={[calloutInputRule]} />
    </>
  )
}

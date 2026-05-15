import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'

type Tone = 'note' | 'tip' | 'important' | 'warning' | 'caution'

const tones: Record<Tone, {label: string; glyph: string}> = {
  note: {label: 'Note', glyph: 'i'},
  tip: {label: 'Tip', glyph: '★'},
  important: {label: 'Important', glyph: '!'},
  warning: {label: 'Warning', glyph: '⚠'},
  caution: {label: 'Caution', glyph: '⊘'},
}

function isTone(value: string): value is Tone {
  return (
    value === 'note' ||
    value === 'tip' ||
    value === 'important' ||
    value === 'warning' ||
    value === 'caution'
  )
}

const calloutContainer = defineContainer({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children, node}) => {
    const block = node as {tone?: string}
    const rawTone = block.tone ?? 'note'
    const tone: Tone = isTone(rawTone) ? rawTone : 'note'
    const config = tones[tone]
    return (
      <aside {...attributes} className={`pc-callout pc-callout-${tone}`}>
        <header className="pc-callout-head" contentEditable={false}>
          <span className="pc-callout-glyph" aria-hidden>
            {config.glyph}
          </span>
          <span className="pc-callout-label">{config.label}</span>
        </header>
        <div className="pc-callout-body">{children}</div>
      </aside>
    )
  },
})

export function CalloutPlugin() {
  return <ContainerPlugin containers={[calloutContainer]} />
}

import {defineContainer} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import type {ReactNode} from 'react'
import {
  InfoIcon,
  LightbulbIcon,
  WarningCircleIcon,
  WarningIcon,
  WarningOctagonIcon,
} from '../icons'

type Tone = 'note' | 'tip' | 'important' | 'warning' | 'caution'

const tones: Record<Tone, {label: string; icon: () => ReactNode}> = {
  note: {label: 'Note', icon: () => <InfoIcon size={14} />},
  tip: {label: 'Tip', icon: () => <LightbulbIcon size={14} />},
  important: {label: 'Important', icon: () => <WarningCircleIcon size={14} />},
  warning: {label: 'Warning', icon: () => <WarningIcon size={14} />},
  caution: {label: 'Caution', icon: () => <WarningOctagonIcon size={14} />},
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
  render: ({attributes, children, node, selected, focused}) => {
    const block = node as {tone?: string}
    const rawTone = block.tone ?? 'note'
    const tone: Tone = isTone(rawTone) ? rawTone : 'note'
    const config = tones[tone]
    return (
      <aside
        {...attributes}
        className={`pc-callout pc-callout-${tone}`}
        data-selected={selected || undefined}
        data-focused={focused || undefined}
      >
        <header className="pc-callout-head" contentEditable={false}>
          <span className="pc-callout-glyph" aria-hidden>
            {config.icon()}
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

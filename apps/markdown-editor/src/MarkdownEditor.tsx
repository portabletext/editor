import {
  PortableTextEditable,
  type BlockStyleRenderProps,
} from '@portabletext/editor'
import {useCallback} from 'react'
import {useMarkdownBlockStyles} from './use-markdown-block-styles.ts'
import {useMarkdownDecorations} from './use-markdown-decorations.ts'

const styleClasses: Record<string, string> = {
  normal: 'text-base',
  h1: 'text-3xl font-bold',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-medium',
  h5: 'text-base font-medium',
  h6: 'text-sm font-medium uppercase tracking-wide',
}

export function MarkdownEditor() {
  const decorations = useMarkdownDecorations()
  useMarkdownBlockStyles()

  const renderStyle = useCallback((props: BlockStyleRenderProps) => {
    const className = styleClasses[props.value] ?? styleClasses.normal
    return <div className={className}>{props.children}</div>
  }, [])

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
      <PortableTextEditable
        className="outline-none p-6 min-h-[400px] text-stone-800 leading-relaxed [&>[data-slate-node=element]]:my-2"
        rangeDecorations={decorations}
        renderStyle={renderStyle}
      />
    </div>
  )
}

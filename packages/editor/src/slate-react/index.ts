// Components
export {
  Editable,
  type RenderElementProps,
  type RenderLeafProps,
  type RenderPlaceholderProps,
  DefaultPlaceholder,
  defaultScrollSelectionIntoView,
} from './components/editable'

export {DefaultElement} from './components/element'
export {DefaultText} from './components/text'
export {DefaultLeaf} from './components/leaf'
export {Slate} from './components/slate'

// Hooks
export {useElement, useElementIf} from './hooks/use-element'
export {useSlateStatic} from './hooks/use-slate-static'

export {useReadOnly} from './hooks/use-read-only'
export {useSlate} from './hooks/use-slate'
export {useSlateSelector} from './hooks/use-slate-selector'

// Plugin
export {ReactEditor} from './plugin/react-editor'
export {withReact} from './plugin/with-react'

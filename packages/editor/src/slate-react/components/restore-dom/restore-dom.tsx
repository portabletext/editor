import {
  Component,
  type ComponentType,
  type ContextType,
  type ReactNode,
  type RefObject,
} from 'react'
import {IS_ANDROID} from '../../../slate-dom'
import {EditorContext} from '../../hooks/use-slate-static'
import {
  createRestoreDomManager,
  type RestoreDOMManager,
} from './restore-dom-manager'

const MUTATION_OBSERVER_CONFIG: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  characterDataOldValue: true,
}

type RestoreDOMProps = {
  children?: ReactNode
  receivedUserInput: RefObject<boolean>
  node: RefObject<HTMLDivElement | null>
}

// We have to use a class component here since we rely on `getSnapshotBeforeUpdate` which has no FC equivalent
// to run code synchronously immediately before react commits the component update to the DOM.
class RestoreDOMComponent extends Component<RestoreDOMProps> {
  static override contextType = EditorContext
  override context: ContextType<typeof EditorContext> = null

  private manager: RestoreDOMManager | null = null
  private mutationObserver: MutationObserver | null = null

  observe() {
    const {node} = this.props
    if (!node.current) {
      throw new Error('Failed to attach MutationObserver, `node` is undefined')
    }

    this.mutationObserver?.observe(node.current, MUTATION_OBSERVER_CONFIG)
  }

  override componentDidMount() {
    const {receivedUserInput} = this.props
    const editor = this.context!

    this.manager = createRestoreDomManager(editor, receivedUserInput)
    this.mutationObserver = new MutationObserver(this.manager.registerMutations)

    this.observe()
  }

  override getSnapshotBeforeUpdate() {
    try {
      const pendingMutations = this.mutationObserver?.takeRecords()
      if (pendingMutations?.length) {
        this.manager?.registerMutations(pendingMutations)
      }

      this.mutationObserver?.disconnect()
      this.manager?.restoreDOM()
    } catch {
      // On Android, the IME can mutate the DOM in ways that make
      // restoration impossible (e.g., when rangeDecorations cause React
      // to restructure wrapper elements between the mutation and the
      // restore). Silently skip — the editor will reconcile to the
      // correct state on the next render cycle.
      this.manager?.clear()
    }

    return null
  }

  override componentDidUpdate() {
    this.manager?.clear()
    this.observe()
  }

  override componentWillUnmount() {
    this.mutationObserver?.disconnect()
  }

  override render() {
    return this.props.children
  }
}

export const RestoreDOM: ComponentType<RestoreDOMProps> = IS_ANDROID
  ? RestoreDOMComponent
  : ({children}) => <>{children}</>

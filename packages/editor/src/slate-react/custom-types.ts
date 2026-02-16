// CustomTypes augmentation removed — PTE's types/slate.ts is the source of truth.
// Slate-react's placeholder/resize props are handled through PTE's own type system.

declare global {
  interface Window {
    MSStream: boolean
  }
  interface DocumentOrShadowRoot {
    getSelection(): Selection | null
  }

  interface CaretPosition {
    readonly offsetNode: Node
    readonly offset: number
    getClientRect(): DOMRect | null
  }

  interface Document {
    caretPositionFromPoint(x: number, y: number): CaretPosition | null
  }

  interface Node {
    getRootNode(options?: GetRootNodeOptions): Document | ShadowRoot
  }
}

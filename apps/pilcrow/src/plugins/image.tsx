import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'

const imageLeaf = defineLeaf({
  type: 'image',
  render: ({attributes, children, focused, node, readOnly, selected}) => {
    const value = node as {
      src?: string
      alt?: string
      caption?: string
    }
    const stateClass =
      (selected ? ' pc-image-selected' : '') +
      (focused ? ' pc-image-focused' : '')
    return (
      <div {...attributes} className="pc-image-wrapper">
        {children}
        <figure
          contentEditable={false}
          draggable={!readOnly}
          className={`pc-image${stateClass}`}
        >
          {value.src ? (
            <img src={value.src} alt={value.alt ?? ''} />
          ) : (
            <div
              className="pc-image-placeholder"
              role="img"
              aria-label="Image placeholder"
            >
              <span>{value.alt ?? 'Image'}</span>
            </div>
          )}
          {value.caption ? (
            <figcaption className="pc-image-caption">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      </div>
    )
  },
})

export function ImagePlugin() {
  return <LeafPlugin leaves={[imageLeaf]} />
}

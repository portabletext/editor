import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'

const imageLeaf = defineLeaf({
  type: 'image',
  render: ({attributes, children, node, selected, focused}) => {
    const image = node as {src?: string; alt?: string; title?: string}
    return (
      <figure
        {...attributes}
        className="pc-image"
        contentEditable={false}
        data-selected={selected || undefined}
        data-focused={focused || undefined}
      >
        <img src={image.src ?? ''} alt={image.alt ?? ''} title={image.title} />
        {image.title ? (
          <figcaption className="pc-image-caption">{image.title}</figcaption>
        ) : null}
        {children}
      </figure>
    )
  },
})

export function ImagePlugin() {
  return <LeafPlugin leaves={[imageLeaf]} />
}

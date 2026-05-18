import {defineBlockObject} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'

/**
 * Image leaf. Markdown `![alt](src "title")` round-trips into
 *
 *   { _type: 'image', src, alt, title? }
 *
 * The image renders without a visible caption; the title surfaces as
 * an `<img title>` hover tooltip per the markdown spec. Add a caption
 * later as a separate feature if the writing surface needs one.
 */
const image = defineBlockObject({
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
        {children}
      </figure>
    )
  },
})

export function ImagePlugin() {
  return <NodePlugin nodes={[image]} />
}

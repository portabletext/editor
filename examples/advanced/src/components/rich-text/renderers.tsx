import type {
  PortableTextChild,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderStyleFunction,
} from '@portabletext/editor'

export const renderDecorator: RenderDecoratorFunction = ({value, children}) => {
  if (value === 'strong') {
    return <strong>{children}</strong>
  }

  if (value === 'em') {
    return <em>{children}</em>
  }

  if (value === 'underline') {
    return <u>{children}</u>
  }

  return children
}

export const renderStyle: RenderStyleFunction = ({schemaType, children}) => {
  if (schemaType.value === 'h1') {
    return <h1>{children}</h1>
  }

  if (schemaType.value === 'h2') {
    return <h2>{children}</h2>
  }

  if (schemaType.value === 'h3') {
    return <h3>{children}</h3>
  }

  if (schemaType.value === 'blockquote') {
    return <blockquote className="editor italic">{children}</blockquote>
  }

  return <div className="p-1">{children}</div>
}

function isImage(
  props: PortableTextChild,
): props is PortableTextChild & {src: string} {
  return 'src' in props
}

function isVideo(
  props: PortableTextChild,
): props is PortableTextChild & {src: string; mediaType: string} {
  return 'src' in props
}

function isLink(
  props: PortableTextChild,
): props is PortableTextChild & {url: string; name: string} {
  return 'url' in props
}

export const renderChild: RenderChildFunction = (props) => {
  if (props.schemaType.name === 'link' && isLink(props.value)) {
    return (
      <a href={props.value.url} target="_blank" rel="noreferrer">
        {props.value.name}
      </a>
    )
  }

  if (props.schemaType.name === 'image' && isImage(props.value)) {
    return (
      <img
        src={props.value.src}
        className="max-h-24 max-w-24 hover:brightness-110 mx-1"
      />
    )
  }

  if (props.schemaType.name === 'video' && isVideo(props.value)) {
    return (
      <video className="size-30 rounded-md mx-1" controls>
        <source src={props.value.src} type={props.value.mediaType} />
      </video>
    )
  }

  return <>{props.children}</>
}

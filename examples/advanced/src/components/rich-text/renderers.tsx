import {Pdf} from '@/components/pdf'
import {Video} from '@/components/video'
import {IMediaContent} from '@/types/file'
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

function isFile(
  props: PortableTextChild,
): props is PortableTextChild & IMediaContent {
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

  if (props.schemaType.name === 'media' && isFile(props.value)) {
    const mediaType = props.value.mediaType
    if (mediaType?.includes('image')) {
      return (
        <img
          src={props.value.src}
          className="max-h-24 max-w-24 hover:brightness-110 mx-1"
        />
      )
    }

    if (mediaType?.includes('video')) {
      return (
        <Video
          src={props.value.src as string}
          mediaType={props.value.mediaType}
          className="size-30 rounded-md mx-1"
          controls
        />
      )
    }

    if (mediaType?.includes('pdf')) {
      return (
        <Pdf
          name={props.value.name}
          src={props.value.src}
          mediaType={props.value.mediaType}
          className="m-1"
        />
      )
    }
  }

  return <>{props.children}</>
}

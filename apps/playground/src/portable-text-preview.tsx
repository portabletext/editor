import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {
  startTransition,
  useEffect,
  useState,
  // @ts-expect-error types not available yet
  unstable_ViewTransition as ViewTransition,
  type CSSProperties,
} from 'react'
import type {PlaygroundActorRef} from './playground-machine'

function getViewTransitionName(value: string | undefined) {
  return value ? `pt-${value}` : undefined
}

function style(value: string | undefined): CSSProperties {
  return {
    viewTransitionName: getViewTransitionName(value),
  }
}

function attrs(key: string | undefined) {
  if (!key) return null
  return {
    style: style(key),
  }
}

const components: PortableTextComponents = {
  block: {
    normal: ({children, value}) => (
      <p key={value?._key} {...attrs(value?._key)}>
        {children}
      </p>
    ),
    blockquote: ({children, value}) => (
      <blockquote key={value?._key} {...attrs(value?._key)}>
        {children}
      </blockquote>
    ),
    h1: ({children, value}) => (
      <h1 key={value?._key} {...attrs(value?._key)}>
        {children}
      </h1>
    ),
    h2: ({children, value}) => (
      <h2 key={value?._key} {...attrs(value?._key)}>
        {children}
      </h2>
    ),
    h3: ({children, value}) => (
      <h3 key={value?._key} {...attrs(value?._key)}>
        {children}
      </h3>
    ),
    h4: ({children, value}) => (
      <h4 key={value?._key} {...attrs(value?._key)}>
        {children}
      </h4>
    ),
    h5: ({children, value}) => (
      <h5
        key={value?._key}
        {...attrs(value?._key)}
        className="mb-2 text-sm font-semibold"
      >
        {children}
      </h5>
    ),
    h6: ({children, value}) => (
      <h6
        key={value?._key}
        {...attrs(value?._key)}
        className="mb-1 text-xs font-semibold"
      >
        {children}
      </h6>
    ),
  },
  list: {
    number: ({children, value}) => (
      <ol key={value?._key} {...attrs(value?._key)}>
        {children}
      </ol>
    ),
    bullet: ({children, value}) => (
      <ul key={value?._key} {...attrs(value?._key)}>
        {children}
      </ul>
    ),
  },
  listItem: ({children, value}) => (
    <li key={value?._key} {...attrs(value?._key)}>
      {children}
    </li>
  ),
  marks: {
    link: ({children, value}) => {
      return (
        <a
          key={value?._key}
          {...attrs(value?._key)}
          href={value?.href}
          className="whitespace-nowrap"
          rel="noreferrer noopener"
        >
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({value}) => {
      if (!value?.url) {
        return null
      }
      return (
        <img
          key={value?._key}
          {...attrs(value?._key)}
          // className="w-full h-auto"
          alt={value.alt || ''}
          // use random value since the example image isn't real
          src={'https://picsum.photos/200/300?' + value?._key}
        />
      )
    },
  },
}

export function PortableTextPreview(props: {
  playgroundRef: PlaygroundActorRef
}) {
  const [value, setValue] = useState<any>(null)

  useEffect(() => {
    props.playgroundRef.subscribe((s) => {
      // Wrapping the value in `startTransition` triggers the CSS ViewTransition
      startTransition(() => setValue(s.context.value))
    })
  }, [props.playgroundRef])

  return (
    <ViewTransition>
      <div className="prose">
        <PortableText components={components} value={value} />
      </div>
    </ViewTransition>
  )
}

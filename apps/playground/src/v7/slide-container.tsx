import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {useContext} from 'react'
import type {JSX} from 'react'
import {SlideIndexContext} from './slide-nav-context'

const slideContainer = defineContainer({
  type: 'slide',
  childField: 'content',
  render: ({attributes, children, node, path}) => {
    return (
      <SlideFrame attributes={attributes} slideKey={node._key} path={path}>
        {children}
      </SlideFrame>
    )
  },
  of: [
    defineTextBlock({
      type: 'block',
      render: ({attributes, children, node}) => {
        if (node.listItem !== undefined) {
          return (
            <div {...attributes} className="my-1.5">
              {children}
            </div>
          )
        }

        switch (node.style) {
          case 'h1':
            return (
              <h1
                {...attributes}
                className="mt-2 mb-6 font-bold text-5xl tracking-tight text-stone-900 dark:text-stone-50"
              >
                {children}
              </h1>
            )
          case 'h2':
            return (
              <h2
                {...attributes}
                className="mt-6 mb-3 font-semibold text-3xl tracking-tight text-stone-800 dark:text-stone-100"
              >
                {children}
              </h2>
            )
          case 'h3':
            return (
              <h3
                {...attributes}
                className="mt-4 mb-2 font-semibold text-xl text-stone-800 dark:text-stone-100"
              >
                {children}
              </h3>
            )
          default:
            return (
              <p
                {...attributes}
                className="my-3 text-xl leading-relaxed text-stone-700 dark:text-stone-200"
              >
                {children}
              </p>
            )
        }
      },
    }),
  ],
})

function SlideFrame(props: {
  attributes: Record<string, unknown>
  slideKey: string | undefined
  path: ReadonlyArray<unknown>
  children: React.ReactNode
}) {
  const {currentIndex, slideKeys} = useContext(SlideIndexContext)
  const slideIndex = props.slideKey ? slideKeys.indexOf(props.slideKey) : -1
  const isActive = slideIndex === currentIndex

  return (
    <section
      {...(props.attributes as Record<string, string>)}
      data-slide-index={slideIndex >= 0 ? slideIndex : undefined}
      data-active={isActive ? '' : undefined}
      className={
        isActive
          ? 'slide-visible relative mx-auto my-0 flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center px-12 py-16'
          : 'slide-hidden absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0'
      }
      aria-hidden={!isActive}
    >
      {props.children}
    </section>
  )
}

export function SlidePlugin(): JSX.Element {
  return <ContainerPlugin containers={[slideContainer]} />
}

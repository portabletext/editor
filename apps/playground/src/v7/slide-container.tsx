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
                className="mt-2 mb-4 font-bold text-4xl tracking-tight text-stone-900 sm:mb-5 sm:text-5xl md:mb-6 md:text-6xl dark:text-stone-50"
              >
                {children}
              </h1>
            )
          case 'h2':
            return (
              <h2
                {...attributes}
                className="mt-5 mb-2 font-semibold text-xl tracking-tight text-stone-800 sm:text-2xl md:mt-6 md:mb-3 md:text-3xl dark:text-stone-100"
              >
                {children}
              </h2>
            )
          case 'h3':
            return (
              <h3
                {...attributes}
                className="-mt-1 mb-5 font-medium text-lg text-stone-500 sm:text-xl md:mb-8 md:text-2xl dark:text-stone-400"
              >
                {children}
              </h3>
            )
          default:
            return (
              <p
                {...attributes}
                className="my-2 text-base leading-relaxed text-stone-700 sm:my-3 sm:text-lg md:text-xl dark:text-stone-200"
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
      className={[
        'absolute inset-0 mx-auto flex flex-col justify-center',
        'px-5 py-12 sm:px-8 sm:py-14 md:px-12 md:py-16',
        'mx-auto w-full max-w-4xl',
        'transition-opacity duration-300 ease-in-out',
        isActive
          ? 'opacity-100 pointer-events-auto z-10'
          : 'opacity-0 pointer-events-none z-0',
      ].join(' ')}
      aria-hidden={!isActive}
    >
      {/* Milestone kicker - small numeric badge in the corner. */}
      {slideIndex >= 0 ? (
        <div
          contentEditable={false}
          className="absolute top-5 left-5 select-none font-mono text-[10px] text-stone-400 tracking-widest uppercase sm:top-6 sm:left-8 sm:text-xs md:top-8 md:left-12 dark:text-stone-500"
        >
          {String(slideIndex + 1).padStart(2, '0')} /{' '}
          {String(slideKeys.length).padStart(2, '0')}
        </div>
      ) : null}
      {props.children}
    </section>
  )
}

export function SlidePlugin(): JSX.Element {
  return <ContainerPlugin containers={[slideContainer]} />
}

import type {PortableTextReactComponents} from '@portabletext/react'

export const portableTextComponents: Partial<PortableTextReactComponents> = {
  types: {
    'break': () => <hr className="my-4 border-gray-300 dark:border-gray-600" />,
    'image': ({value}: {value: {src?: string; alt?: string}}) => (
      <figure className="my-4">
        <img
          src={value.src}
          alt={value.alt || ''}
          className="max-w-full rounded"
        />
        {value.alt && (
          <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            {value.alt}
          </figcaption>
        )}
      </figure>
    ),
    'stock-ticker': ({value}: {value: {symbol?: string}}) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-mono text-sm">
        ${value.symbol}
      </span>
    ),
    'mention': ({value}: {value: {username?: string; name?: string}}) => (
      <span className="text-blue-600 dark:text-blue-400 font-medium">
        @{value.username || value.name}
      </span>
    ),
  },
  marks: {
    'strong': ({children}) => <strong className="font-bold">{children}</strong>,
    'em': ({children}) => <em className="italic">{children}</em>,
    'code': ({children}) => (
      <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-sm">
        {children}
      </code>
    ),
    'underline': ({children}) => <span className="underline">{children}</span>,
    'strike-through': ({children}) => (
      <del className="line-through">{children}</del>
    ),
    'subscript': ({children}) => <sub>{children}</sub>,
    'superscript': ({children}) => <sup>{children}</sup>,
    'link': ({
      value,
      children,
    }: {
      value?: {href?: string}
      children: React.ReactNode
    }) => (
      <a
        href={value?.href}
        className="text-blue-600 dark:text-blue-400 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    'comment': ({
      value,
      children,
    }: {
      value?: {text?: string}
      children: React.ReactNode
    }) => (
      <mark
        title={value?.text}
        className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded cursor-help"
      >
        {children}
      </mark>
    ),
  },
  block: {
    normal: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
    h1: ({children}) => (
      <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
    ),
    h2: ({children}) => (
      <h2 className="text-2xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
    ),
    h3: ({children}) => (
      <h3 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h3>
    ),
    h4: ({children}) => (
      <h4 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h4>
    ),
    h5: ({children}) => (
      <h5 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h5>
    ),
    h6: ({children}) => (
      <h6 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h6>
    ),
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4 text-gray-600 dark:text-gray-400">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({children}) => <ul className="list-disc pl-6 mb-4">{children}</ul>,
    number: ({children}) => (
      <ol className="list-decimal pl-6 mb-4">{children}</ol>
    ),
  },
}

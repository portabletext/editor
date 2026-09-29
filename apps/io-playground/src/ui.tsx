import type {ReactNode} from 'react'

const badgeTones = {
  gray: 'bg-gray-200 text-gray-700',
  green: 'bg-green-100 text-green-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
}

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof badgeTones
  children: ReactNode
}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Notation({children}: {children: ReactNode}) {
  return (
    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm break-all ring-1 ring-gray-200">
      {children}
    </code>
  )
}

export function Empty({children}: {children: ReactNode}) {
  return <p className="text-xs text-gray-400 italic">{children}</p>
}

export function ItemList({children}: {children: ReactNode}) {
  return <ul className="flex flex-col gap-1 font-mono text-xs">{children}</ul>
}

export function Button({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs whitespace-nowrap hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  width = 'w-28',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  width?: string
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`rounded border border-gray-300 px-1.5 py-0.5 font-mono text-xs ${width}`}
    />
  )
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

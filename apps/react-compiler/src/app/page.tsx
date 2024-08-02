import Link from 'next/link'

export default function IndexPage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxHeight: '100dvh',
        height: '100vh',
        flexDirection: 'column',
        gap: '25dvh',
        fontSize: '2rem',
      }}
    >
      <Link href="/playground">Playground</Link>
      <Link href="/studio">Sanity Studio</Link>
    </div>
  )
}

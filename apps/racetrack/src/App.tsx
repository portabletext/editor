/**
 * Racetrack landing page.
 *
 * A teaser - just the name. The real app is being built on the
 * `feat/racetrack` long-running branch and replaces this over time
 * via Vercel preview deploys.
 */

export function App() {
  return (
    <main className="rt-shell">
      <section className="rt-tease">
        <div className="rt-tease-mark" aria-hidden>
          <span className="rt-dot rt-dot--pass" />
          <span className="rt-dot rt-dot--running" />
          <span className="rt-dot rt-dot--fail" />
        </div>
        <h1 className="rt-tease-name">Racetrack</h1>
        <p className="rt-tease-tag">Coming to the Portable Text paddock.</p>
      </section>
    </main>
  )
}

import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <section className="page-placeholder" aria-labelledby="not-found-title">
      <p className="eyebrow">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p className="page-placeholder__description">
        We couldn’t find the page you’re looking for.
      </p>
      <Link className="button button--solid" to="/">Back to home</Link>
    </section>
  )
}

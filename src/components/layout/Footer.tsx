import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__content">
        <Link className="brand brand--footer" to="/">
          <span className="brand__mark" aria-hidden="true">F</span>
          <span>Fresh<span className="brand__accent">Cart</span></span>
        </Link>
        <p>Everyday essentials, made easy.</p>
        <span className="site-footer__copyright">
          © {new Date().getFullYear()} FreshCart
        </span>
      </div>
    </footer>
  )
}

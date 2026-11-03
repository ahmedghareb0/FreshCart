import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/useCart'

const navigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
  { to: '/categories', label: 'Categories' },
  { to: '/brands', label: 'Brands' },
]

export function Navbar() {
  const { isAuthenticated, logout } = useAuth()
  const cart = useCart()

  return (
    <>
      <div className="announcement">
        <div className="container announcement__inner">
          <span>Free shipping on orders over 500 EGP</span>
          <span className="announcement__secondary">Fresh picks, delivered daily</span>
        </div>
      </div>
      <header className="site-header">
        <div className="container site-header__main">
          <Link className="brand" to="/" aria-label="FreshCart home">
            <span className="brand__mark" aria-hidden="true">F</span>
            <span>Fresh<span className="brand__accent">Cart</span></span>
          </Link>
          <nav className="primary-nav" aria-label="Main navigation">
            {navigation.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  isActive ? 'primary-nav__link is-active' : 'primary-nav__link'
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <Link className="header-actions__link header-actions__wishlist" to="/wishlist">
              <span aria-hidden="true">♡</span> Wishlist
            </Link>
            <Link className="header-actions__link header-actions__cart" to="/cart">
              <span aria-hidden="true">▣</span> Cart
              {isAuthenticated && !cart.loading && !cart.error && cart.itemCount > 0 && (
                <span className="cart-count" aria-label={`${cart.itemCount} items in cart`}>
                  {cart.itemCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <>
                <Link className="header-actions__link" to="/change-password">Account</Link>
                <Link className="header-actions__link header-actions__orders" to="/orders">
                  My Orders
                </Link>
                <button className="button button--outline" type="button" onClick={logout}>Sign out</button>
              </>
            ) : (
              <Link className="button button--outline" to="/login">Sign in</Link>
            )}
          </div>
        </div>
      </header>
    </>
  )
}

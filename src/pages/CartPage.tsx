import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { useCart } from '../context/useCart'
import { ApiError } from '../services/api'
import type { CartItem } from '../context/cart-context'

const priceFormatter = new Intl.NumberFormat('en-EG', {
  maximumFractionDigits: 2,
})

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} EGP`
}

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    return `Cart request failed (HTTP ${error.status}).`
  }
  return error instanceof Error ? error.message : 'The cart request failed.'
}

function CartLine({ item }: { item: CartItem }) {
  const cart = useCart()
  const product = item.product
  const pending = cart.pendingIds.has(product._id) || cart.clearPending
  const [error, setError] = useState<string | null>(null)

  async function updateCount(count: number) {
    if (!Number.isInteger(count) || count < 1) {
      return
    }
    setError(null)
    try {
      await cart.update(product._id, count)
    } catch (cause: unknown) {
      setError(requestError(cause))
    }
  }

  async function remove() {
    setError(null)
    try {
      await cart.remove(product._id)
    } catch (cause: unknown) {
      setError(requestError(cause))
    }
  }

  return (
    <article className="cart-line">
      <Link
        className="cart-line__image"
        to={`/products/${encodeURIComponent(product._id)}`}
        aria-label={`View ${product.title}`}
      >
        <img src={product.imageCover} alt={product.title} />
      </Link>
      <div className="cart-line__details">
        <p className="cart-line__category">{product.category.name}</p>
        <h2><Link to={`/products/${encodeURIComponent(product._id)}`}>{product.title}</Link></h2>
        <p className="cart-line__price">{formatPrice(item.price)} <span>each</span></p>
        <div className="cart-line__controls">
          <div className="quantity-control" aria-label={`Quantity for ${product.title}`}>
            <button
              type="button"
              aria-label={`Decrease ${product.title} quantity`}
              disabled={pending || item.count <= 1}
              onClick={() => void updateCount(item.count - 1)}
            >
              −
            </button>
            <output aria-label="Quantity">{item.count}</output>
            <button
              type="button"
              aria-label={`Increase ${product.title} quantity`}
              disabled={pending || item.count >= product.quantity}
              onClick={() => void updateCount(item.count + 1)}
            >
              +
            </button>
          </div>
          <button className="cart-line__remove" type="button" disabled={pending} onClick={() => void remove()}>
            Remove
          </button>
        </div>
        {error && <p className="cart-line__error" role="alert">{error}</p>}
      </div>
      <p className="cart-line__subtotal" aria-label={`Item subtotal ${formatPrice(item.subtotal)}`}>
        {formatPrice(item.subtotal)}
      </p>
    </article>
  )
}

export function CartPage() {
  const cart = useCart()
  const [couponName, setCouponName] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [clearError, setClearError] = useState<string | null>(null)

  async function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    cart.clearCouponFeedback()
    try {
      await cart.apply(couponName)
    } catch (error: unknown) {
      setActionError(requestError(error))
    }
  }

  async function clearAll() {
    if (cart.items.length === 0 || cart.clearPending || cart.pendingIds.size > 0) {
      return
    }
    if (!window.confirm('Clear every item from your cart?')) {
      return
    }
    setClearError(null)
    try {
      await cart.clear()
    } catch (error: unknown) {
      setClearError(requestError(error))
    }
  }

  return (
    <section className="cart-page" aria-labelledby="cart-title">
      <header className="cart-page__heading">
        <div>
          <p className="eyebrow">Your FreshCart bag</p>
          <h1 id="cart-title">Shopping cart</h1>
          {!cart.loading && !cart.error && (
            <p className="products-page__intro">
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} in your cart.
            </p>
          )}
        </div>
        {cart.items.length > 0 && (
          <button
            className="button button--outline"
            type="button"
            disabled={cart.clearPending || cart.pendingIds.size > 0}
            onClick={() => void clearAll()}
          >
            {cart.clearPending ? 'Clearing…' : 'Clear cart'}
          </button>
        )}
      </header>

      {cart.error ? (
        <div className="cart-page__state">
          <ErrorMessage message={cart.error} />
          <button
            className="button button--outline"
            type="button"
            disabled={cart.loading}
            onClick={() => void cart.refresh().catch(() => undefined)}
          >
            {cart.loading ? 'Loading…' : 'Try again'}
          </button>
        </div>
      ) : cart.loading ? (
        <Loading />
      ) : cart.items.length === 0 ? (
        <div className="cart-empty">
          <span className="cart-empty__icon" aria-hidden="true">🛒</span>
          <h2>Your cart is empty</h2>
          <p>Browse the catalog and add something you love.</p>
          <Link className="button button--solid" to="/products">
            Continue shopping
          </Link>
        </div>
      ) : (
        <>
          {clearError && <ErrorMessage message={clearError} />}
          <div className="cart-layout">
            <div className="cart-lines" aria-label="Cart items">
              {cart.items.map((item) => (
                <CartLine key={item.product._id} item={item} />
              ))}
            </div>
            <aside className="cart-summary" aria-label="Cart summary">
              <h2>Order summary</h2>
              <div className="cart-summary__row">
                <span>Subtotal ({cart.itemCount} items)</span>
                <strong>{cart.subtotal === null ? 'Unavailable' : formatPrice(cart.subtotal)}</strong>
              </div>
              {cart.couponMessage && <p className="cart-coupon__success" role="status">{cart.couponMessage}</p>}
              {(cart.couponError || actionError) && (
                <p className="cart-coupon__error" role="alert">{cart.couponError ?? actionError}</p>
              )}
              <form className="cart-coupon" onSubmit={(event) => void submitCoupon(event)}>
                <label htmlFor="cart-coupon-code">Coupon code</label>
                <div>
                  <input
                    id="cart-coupon-code"
                    value={couponName}
                    onChange={(event) => setCouponName(event.target.value)}
                    autoComplete="off"
                    required
                  />
                  <button className="button button--outline" type="submit" disabled={cart.couponPending || cart.loading}>
                    {cart.couponPending ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              </form>
              <div className="cart-summary__total">
                <span>{cart.total === null ? 'Total unavailable' : 'Estimated total'}</span>
                <strong>{cart.total === null ? 'Provided by server at checkout' : formatPrice(cart.total)}</strong>
              </div>
              <p className="cart-summary__note">
                Totals are calculated from the validated product prices and quantities. Tax, shipping, and coupon adjustments are not estimated here.
              </p>
              <Link className="button button--solid cart-summary__continue" to="/products">
                Continue shopping
              </Link>
              <Link className="button button--outline cart-summary__checkout" to="/checkout">
                Proceed to checkout
              </Link>
            </aside>
          </div>
        </>
      )}
    </section>
  )
}

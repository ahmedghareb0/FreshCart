import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useCart } from '../../context/useCart'
import { ApiError } from '../../services/api'

function getActionError(error: unknown): string {
  if (error instanceof ApiError) {
    return `Could not update the cart (HTTP ${error.status}).`
  }
  return error instanceof Error ? error.message : 'Could not update the cart.'
}

export function AddToCartButton({
  productId,
  placement = 'card',
}: {
  productId: string
  placement?: 'card' | 'details'
}) {
  const { status: authStatus, isAuthenticated } = useAuth()
  const cart = useCart()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (authStatus === 'loading') {
    return (
      <button className={`cart-add-button cart-add-button--${placement}`} type="button" disabled>
        Checking session…
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link
        className={`cart-add-button cart-add-button--${placement} is-guest`}
        to="/login"
        state={{ from: location }}
      >
        Sign in to add to cart
      </Link>
    )
  }

  async function addProduct() {
    setBusy(true)
    setMessage('')
    setError(null)
    try {
      await cart.add(productId)
      setMessage('Added to cart.')
    } catch (actionError: unknown) {
      setError(getActionError(actionError))
    } finally {
      setBusy(false)
    }
  }

  const isPending = busy || cart.loading || cart.pendingIds.has(productId) || cart.clearPending
  const count = cart.countFor(productId)

  return (
    <div className={`cart-add-action cart-add-action--${placement}`}>
      <button
        className={`cart-add-button cart-add-button--${placement}`}
        type="button"
        disabled={isPending}
        onClick={() => void addProduct()}
      >
        {isPending
          ? 'Please wait…'
          : count > 0
            ? `Add to cart · ${count} in cart`
            : 'Add to cart'}
      </button>
      {(message || error) && (
        <span className={error ? 'cart-add-feedback is-error' : 'cart-add-feedback'} role={error ? 'alert' : 'status'}>
          {error ?? message}
        </span>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useWishlist } from '../../context/useWishlist'
import { ApiError } from '../../services/api'

function getActionError(error: unknown): string {
  if (error instanceof ApiError) {
    return `Wishlist update failed (HTTP ${error.status}).`
  }
  return error instanceof Error ? error.message : 'Wishlist update failed.'
}

export function WishlistButton({
  productId,
  placement = 'card',
}: {
  productId: string
  placement?: 'card' | 'details'
}) {
  const { status: authStatus, isAuthenticated } = useAuth()
  const wishlist = useWishlist()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (authStatus === 'loading') {
    return (
      <button
        className={`wishlist-button wishlist-button--${placement}`}
        type="button"
        disabled
        aria-label="Checking your wishlist"
      >
        ♡
      </button>
    )
  }

  if (!isAuthenticated) {
    return (
      <Link
        className={`wishlist-button wishlist-button--${placement}`}
        to="/login"
        state={{ from: location }}
        aria-label="Sign in to save this product to your wishlist"
        title="Sign in to save"
      >
        ♡
      </Link>
    )
  }

  async function toggleWishlist() {
    setBusy(true)
    setFeedback('')
    setError(null)
    try {
      if (wishlist.contains(productId)) {
        await wishlist.remove(productId)
        setFeedback('Removed from wishlist.')
      } else {
        await wishlist.add(productId)
        setFeedback('Added to wishlist.')
      }
    } catch (actionError: unknown) {
      setError(getActionError(actionError))
    } finally {
      setBusy(false)
    }
  }

  if (wishlist.error) {
    return (
      <button
        className={`wishlist-button wishlist-button--${placement}`}
        type="button"
        disabled={wishlist.loading || busy}
        onClick={() => void wishlist.refresh().catch(() => undefined)}
        aria-label="Retry loading wishlist"
        title="Retry loading wishlist"
      >
        ↻
      </button>
    )
  }

  const isSaved = wishlist.contains(productId)
  const isPending = busy || wishlist.pendingIds.has(productId) || wishlist.loading

  return (
    <span className={`wishlist-action wishlist-action--${placement}`}>
      <button
        className={
          isSaved
            ? `wishlist-button wishlist-button--${placement} is-saved`
            : `wishlist-button wishlist-button--${placement}`
        }
        type="button"
        disabled={isPending}
        onClick={() => void toggleWishlist()}
        aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={isSaved}
        title={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        {isPending ? '…' : isSaved ? '♥' : '♡'}
      </button>
      {(feedback || error) && (
        <span className={error ? 'wishlist-feedback is-error' : 'wishlist-feedback'} role={error ? 'alert' : 'status'}>
          {error ?? feedback}
        </span>
      )}
    </span>
  )
}

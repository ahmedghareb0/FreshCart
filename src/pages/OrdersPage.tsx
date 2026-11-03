import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { useAuth } from '../context/useAuth'
import { ApiError } from '../services/api'
import {
  getUserOrders,
} from '../services/order-history.service'
import type { OrderHistoryItem } from '../types/order-history'

const priceFormatter = new Intl.NumberFormat('en-EG', {
  maximumFractionDigits: 2,
})

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} EGP`
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Date unavailable'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat('en-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `Could not load orders (HTTP ${error.status}).`
  }
  return error instanceof Error
    ? error.message
    : 'Could not load orders. Check your connection and try again.'
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function OrderCard({ order }: { order: OrderHistoryItem }) {
  const itemCount = order.products.reduce(
    (sum, product) => sum + (product.count ?? 0),
    0,
  )

  return (
    <article className="order-card">
      <header className="order-card__header">
        <div>
          <p className="order-card__label">Order</p>
          <h2>{order.id}</h2>
          <p className="order-card__date">{formatDate(order.createdAt)}</p>
        </div>
        <div className="order-card__total">
          <span>Total</span>
          <strong>{order.total === null ? 'Unavailable' : formatPrice(order.total)}</strong>
        </div>
      </header>

      <dl className="order-card__metadata">
        <div>
          <dt>Products</dt>
          <dd>
            {order.products.length === 0
              ? 'Details unavailable'
              : itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`
                : `${order.products.length} ${order.products.length === 1 ? 'product' : 'products'}`}
          </dd>
        </div>
        {order.status && (
          <div>
            <dt>Order status</dt>
            <dd>{order.status}</dd>
          </div>
        )}
        {order.isPaid !== null && (
          <div>
            <dt>Payment status</dt>
            <dd>{order.isPaid ? 'Paid' : 'Not paid'}</dd>
          </div>
        )}
        {order.paymentMethod && (
          <div>
            <dt>Payment method</dt>
            <dd>{order.paymentMethod}</dd>
          </div>
        )}
      </dl>

      {order.products.length > 0 && (
        <details className="order-card__details">
          <summary>View products</summary>
          <ul className="order-products">
            {order.products.map((product, index) => (
              <li
                className="order-product"
                key={`${product.id ?? 'product'}-${index}`}
              >
                {product.image ? (
                  <img src={product.image} alt={product.title ?? ''} loading="lazy" />
                ) : (
                  <span className="order-product__image-placeholder" aria-hidden="true">
                    —
                  </span>
                )}
                <span className="order-product__info">
                  <strong>{product.title ?? 'Product details unavailable'}</strong>
                  {product.count !== null && <span>Quantity: {product.count}</span>}
                </span>
                {product.price !== null && (
                  <span className="order-product__price">{formatPrice(product.price)}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  )
}

export function OrdersPage() {
  const { token, userId, logout } = useAuth()
  const [orders, setOrders] = useState<OrderHistoryItem[]>([])
  const [ordersOwnerKey, setOrdersOwnerKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const requestControllerRef = useRef<AbortController | null>(null)
  const currentOwnerKey = JSON.stringify([token, userId])
  const currentOwnerKeyRef = useRef(currentOwnerKey)

  useEffect(() => {
    currentOwnerKeyRef.current = currentOwnerKey
  }, [currentOwnerKey])

  const loadOrders = useCallback(async () => {
    const requestOwnerKey = JSON.stringify([token, userId])
    if (currentOwnerKeyRef.current !== requestOwnerKey) {
      return
    }
    requestControllerRef.current?.abort()
    const requestId = ++requestIdRef.current

    if (!token || !userId) {
      requestControllerRef.current = null
      setOrdersOwnerKey(requestOwnerKey)
      setOrders([])
      setError(
        'A valid user ID was not provided by the authenticated user profile. Order history could not be loaded.',
      )
      setLoading(false)
      return
    }

    const controller = new AbortController()
    requestControllerRef.current = controller
    setOrdersOwnerKey(requestOwnerKey)
    setOrders([])
    setLoading(true)
    setError(null)
    try {
      const nextOrders = await getUserOrders(token, userId, controller.signal)
      if (
        controller.signal.aborted ||
        requestId !== requestIdRef.current ||
        currentOwnerKeyRef.current !== requestOwnerKey
      ) {
        return
      }
      setOrders(nextOrders)
    } catch (cause: unknown) {
      if (
        controller.signal.aborted ||
        isAbortError(cause) ||
        requestId !== requestIdRef.current ||
        currentOwnerKeyRef.current !== requestOwnerKey
      ) {
        return
      }
      if (cause instanceof ApiError && cause.status === 401) {
        logout()
      }
      setError(getErrorMessage(cause))
    } finally {
      if (requestId === requestIdRef.current) {
        requestControllerRef.current = null
        setLoading(false)
      }
    }
  }, [logout, token, userId])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (active) {
        return loadOrders()
      }
    })
    return () => {
      active = false
      requestIdRef.current += 1
      requestControllerRef.current?.abort()
      requestControllerRef.current = null
    }
  }, [loadOrders])

  const visibleOrders = ordersOwnerKey === currentOwnerKey ? orders : []
  const visibleError = ordersOwnerKey === currentOwnerKey ? error : null
  const visibleLoading = loading || ordersOwnerKey !== currentOwnerKey

  return (
    <section className="orders-page" aria-labelledby="orders-title">
      <header className="orders-page__heading">
        <div>
          <p className="eyebrow">Your FreshCart account</p>
          <h1 id="orders-title">Order history</h1>
          {!visibleLoading && !visibleError && (
            <p className="products-page__intro">
              {visibleOrders.length} {visibleOrders.length === 1 ? 'order' : 'orders'}
            </p>
          )}
        </div>
        <Link className="button button--outline" to="/products">
          Continue shopping
        </Link>
      </header>

      {visibleLoading ? (
        <Loading />
      ) : visibleError ? (
        <div className="orders-page__state">
          <ErrorMessage message={visibleError} />
          <button
            className="button button--outline"
            type="button"
            onClick={() => void loadOrders()}
          >
            Try again
          </button>
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="orders-empty">
          <h2>No orders yet</h2>
          <p>Your completed orders will appear here.</p>
          <Link className="button button--solid" to="/products">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="orders-list" aria-label="Your orders">
          {visibleOrders.map((order) => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </section>
  )
}

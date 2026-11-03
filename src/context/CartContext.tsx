import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../services/api'
import {
  addToCart,
  applyCoupon,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../services/cart.service'
import { parseCartResponse, type CartSnapshot } from '../services/cart-response'
import { useAuth } from './useAuth'
import { CartContext, type CartContextValue, type CartItem } from './cart-context'

type CartStatus = 'idle' | 'loading' | 'success' | 'error'

type CartState = {
  token: string | null
  items: CartItem[]
  cartId: string | null
  status: CartStatus
  error: string | null
}

const EMPTY_STATE: CartState = {
  token: null,
  items: [],
  cartId: null,
  status: 'idle',
  error: null,
}

type CartRequest = {
  version: number
  promise: Promise<CartSnapshot>
}

const requestsByToken = new Map<string, CartRequest>()
let cartRequestVersion = 0

function getCartRequestVersion(): number {
  return cartRequestVersion
}

function invalidateCartRequests(): void {
  cartRequestVersion += 1
}

function requestCart(token: string, version: number): Promise<CartSnapshot> {
  const existing = requestsByToken.get(token)
  if (existing?.version === version) {
    return existing.promise
  }

  const promise = getCart(token).then(parseCartResponse)
  const request = { version, promise }
  requestsByToken.set(token, request)
  void promise.finally(() => {
    if (requestsByToken.get(token) === request) {
      requestsByToken.delete(token)
    }
  }).catch(() => undefined)
  return promise
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `Cart request failed (HTTP ${error.status}).`
  }
  return error instanceof Error
    ? error.message
    : 'Could not load the cart. Check your connection and try again.'
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, status: authStatus, token, logout } = useAuth()
  const [state, setState] = useState<CartState>(EMPTY_STATE)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [clearPending, setClearPending] = useState(false)
  const [couponPending, setCouponPending] = useState(false)
  const [couponMessage, setCouponMessage] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const pendingIdsRef = useRef(new Set<string>())
  const currentTokenRef = useRef<string | null>(null)
  currentTokenRef.current = isAuthenticated && token ? token : null

  const refresh = useCallback(async () => {
    if (
      !isAuthenticated ||
      !token ||
      currentTokenRef.current !== token
    ) {
      return
    }
    const requestToken = token
    const requestVersion = getCartRequestVersion()
    setState((current) => ({
      token: requestToken,
      items: current.token === requestToken ? current.items : [],
      cartId: current.token === requestToken ? current.cartId : null,
      status: 'loading',
      error: null,
    }))

    try {
      const { items, cartId } = await requestCart(requestToken, requestVersion)
      if (
        currentTokenRef.current === requestToken &&
        getCartRequestVersion() === requestVersion
      ) {
        setState({
          token: requestToken,
          items,
          cartId,
          status: 'success',
          error: null,
        })
      }
    } catch (error: unknown) {
      if (
        currentTokenRef.current !== requestToken ||
        getCartRequestVersion() !== requestVersion
      ) {
        return
      }
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setState((current) => ({
        token: requestToken,
        items: current.token === requestToken ? current.items : [],
        cartId: current.token === requestToken ? current.cartId : null,
        status: 'error',
        error: getErrorMessage(error),
      }))
      throw error
    }
  }, [isAuthenticated, token, logout])

  useEffect(() => {
    if (authStatus === 'loading') {
      return
    }
    if (!isAuthenticated || !token) {
      currentTokenRef.current = null
      setState(EMPTY_STATE)
      setPendingIds(new Set())
      pendingIdsRef.current.clear()
      setClearPending(false)
      setCouponPending(false)
      setCouponMessage(null)
      setCouponError(null)
      return
    }
    setPendingIds(new Set())
    pendingIdsRef.current.clear()
    setClearPending(false)
    setCouponPending(false)
    setCouponMessage(null)
    setCouponError(null)
    void refresh().catch(() => undefined)
  }, [authStatus, isAuthenticated, token, refresh])

  const handleMutationError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      logout()
    }
  }, [logout])

  const runItemAction = useCallback(
    async (
      productId: string,
      action: (authToken: string) => Promise<unknown>,
    ) => {
      if (
        !token ||
        !isAuthenticated ||
        pendingIdsRef.current.has(productId) ||
        clearPending
      ) {
        return
      }
      const actionToken = token
      invalidateCartRequests()
      pendingIdsRef.current.add(productId)
      setPendingIds(new Set(pendingIdsRef.current))
      try {
        try {
          await action(actionToken)
        } catch (error: unknown) {
          handleMutationError(error)
          invalidateCartRequests()
          if (
            !(error instanceof ApiError && error.status === 401) &&
            currentTokenRef.current === actionToken
          ) {
            await refresh().catch(() => undefined)
          }
          throw error
        }
        invalidateCartRequests()
        if (currentTokenRef.current === actionToken) {
          await refresh()
        }
      } finally {
        if (currentTokenRef.current === actionToken) {
          pendingIdsRef.current.delete(productId)
          setPendingIds(new Set(pendingIdsRef.current))
        }
      }
    },
    [clearPending, handleMutationError, isAuthenticated, refresh, token],
  )

  const add = useCallback(
    (productId: string) =>
      runItemAction(productId, (authToken) => addToCart(authToken, productId)),
    [runItemAction],
  )
  const update = useCallback(
    (productId: string, count: number) => {
      if (!Number.isInteger(count) || count < 1) {
        return Promise.reject(new Error('Quantity must be a positive whole number.'))
      }
      return runItemAction(
        productId,
        (authToken) => updateCartItem(authToken, productId, count),
      )
    },
    [runItemAction],
  )
  const remove = useCallback(
    (productId: string) =>
      runItemAction(productId, (authToken) => removeCartItem(authToken, productId)),
    [runItemAction],
  )

  const clear = useCallback(async () => {
    if (!token || !isAuthenticated || clearPending || pendingIdsRef.current.size > 0) {
      return
    }
    const actionToken = token
    invalidateCartRequests()
    setClearPending(true)
    try {
      try {
        await clearCart(actionToken)
      } catch (error: unknown) {
        handleMutationError(error)
        invalidateCartRequests()
        if (
          !(error instanceof ApiError && error.status === 401) &&
          currentTokenRef.current === actionToken
        ) {
          await refresh().catch(() => undefined)
        }
        throw error
      }
      invalidateCartRequests()
      if (currentTokenRef.current === actionToken) {
        await refresh()
      }
    } finally {
      if (currentTokenRef.current === actionToken) {
        setClearPending(false)
      }
    }
  }, [clearPending, handleMutationError, isAuthenticated, refresh, token])

  const apply = useCallback(async (couponName: string) => {
    if (!token || !isAuthenticated || couponPending) {
      return
    }
    setCouponMessage(null)
    setCouponError(null)
    const normalizedCoupon = couponName.trim()
    if (!normalizedCoupon) {
      throw new Error('Enter a coupon code.')
    }
    const actionToken = token
    invalidateCartRequests()
    setCouponPending(true)
    try {
      try {
        await applyCoupon(actionToken, normalizedCoupon)
      } catch (error: unknown) {
        handleMutationError(error)
        invalidateCartRequests()
        if (currentTokenRef.current === actionToken) {
          setCouponError(getErrorMessage(error))
        }
        if (
          !(error instanceof ApiError && error.status === 401) &&
          currentTokenRef.current === actionToken
        ) {
          await refresh().catch(() => undefined)
        }
        throw error
      }
      invalidateCartRequests()
      if (currentTokenRef.current === actionToken) {
        await refresh()
        if (currentTokenRef.current === actionToken) {
          setCouponMessage(
            'Coupon request accepted. No verified discount amount was available to display.',
          )
        }
      }
    } finally {
      if (currentTokenRef.current === actionToken) {
        setCouponPending(false)
      }
    }
  }, [couponPending, handleMutationError, isAuthenticated, refresh, token])

  const clearCouponFeedback = useCallback(() => {
    setCouponMessage(null)
    setCouponError(null)
  }, [])

  const items = useMemo(
    () => state.token === token ? state.items : [],
    [state.items, state.token, token],
  )
  const itemCount = items.reduce((sum, item) => sum + item.count, 0)
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  const visibleState = state.token === token

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      cartId: visibleState ? state.cartId : null,
      itemCount,
      subtotal: items.every((item) => Number.isFinite(item.subtotal)) ? subtotal : null,
      total:
        couponMessage || !items.every((item) => Number.isFinite(item.subtotal))
          ? null
          : subtotal,
      loading:
        isAuthenticated &&
        (!visibleState || state.status === 'loading'),
      error: visibleState ? state.error : null,
      pendingIds,
      clearPending,
      couponPending,
      couponMessage,
      couponError,
      contains: (productId) => items.some((item) => item.product._id === productId),
      countFor: (productId) =>
        items.find((item) => item.product._id === productId)?.count ?? 0,
      refresh,
      add,
      update,
      remove,
      clear,
      apply,
      clearCouponFeedback,
    }),
    [
      items,
      state.cartId,
      itemCount,
      subtotal,
      isAuthenticated,
      visibleState,
      state.status,
      state.error,
      pendingIds,
      clearPending,
      couponPending,
      couponMessage,
      couponError,
      refresh,
      add,
      update,
      remove,
      clear,
      apply,
      clearCouponFeedback,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

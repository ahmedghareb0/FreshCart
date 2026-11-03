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
  addToWishlist as addToWishlistRequest,
  getWishlist,
  removeFromWishlist as removeFromWishlistRequest,
} from '../services/wishlist.service'
import type { Product } from '../types/entities'
import { WishlistContext, type WishlistContextValue } from './wishlist-context'
import { useAuth } from './useAuth'

type WishlistStatus = 'idle' | 'loading' | 'success' | 'error'

type WishlistState = {
  token: string | null
  products: Product[]
  status: WishlistStatus
  error: string | null
}

const EMPTY_STATE: WishlistState = {
  token: null,
  products: [],
  status: 'idle',
  error: null,
}

type WishlistRequest = {
  version: number
  promise: Promise<Product[]>
}

const requestsByToken = new Map<string, WishlistRequest>()
let wishlistRequestVersion = 0

function invalidateWishlistRequests(): void {
  wishlistRequestVersion += 1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNamedEntity(
  value: unknown,
): value is { _id: string; name: string; slug: string; image: string } {
  return isRecord(value) &&
    typeof value._id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.image === 'string'
}

function isSubcategory(
  value: unknown,
): value is { _id: string; name: string; slug: string; category: string } {
  return isRecord(value) &&
    typeof value._id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.category === 'string'
}

function isProduct(value: unknown): value is Product {
  return isRecord(value) &&
    typeof value._id === 'string' &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.description === 'string' &&
    typeof value.quantity === 'number' &&
    typeof value.price === 'number' &&
    typeof value.imageCover === 'string' &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === 'string') &&
    typeof value.sold === 'number' &&
    typeof value.ratingsAverage === 'number' &&
    typeof value.ratingsQuantity === 'number' &&
    isNamedEntity(value.category) &&
    isNamedEntity(value.brand) &&
    Array.isArray(value.subcategory) &&
    value.subcategory.every(isSubcategory) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
}

function parseWishlistResponse(response: unknown): Product[] {
  const products = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : null

  if (!products || !products.every(isProduct)) {
    throw new Error('The wishlist response had an unsupported structure.')
  }
  return products
}

function requestWishlist(token: string, version: number): Promise<Product[]> {
  const existing = requestsByToken.get(token)
  if (existing?.version === version) {
    return existing.promise
  }

  const promise = getWishlist(token).then(parseWishlistResponse)
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
    return `Could not load the wishlist (HTTP ${error.status}).`
  }
  return error instanceof Error
    ? error.message
    : 'Could not load the wishlist. Check your connection and try again.'
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, status: authStatus, token, logout } = useAuth()
  const [state, setState] = useState<WishlistState>(EMPTY_STATE)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const pendingIdsRef = useRef(new Set<string>())
  const currentTokenRef = useRef<string | null>(null)
  currentTokenRef.current = isAuthenticated && token ? token : null

  const refreshWishlist = useCallback(async () => {
    if (
      !isAuthenticated ||
      !token ||
      currentTokenRef.current !== token
    ) {
      return
    }
    const requestToken = token
    const requestVersion = wishlistRequestVersion
    setState((current) => ({
      token: requestToken,
      products: current.token === requestToken ? current.products : [],
      status: 'loading',
      error: null,
    }))

    try {
      const products = await requestWishlist(requestToken, requestVersion)
      if (
        currentTokenRef.current === requestToken &&
        wishlistRequestVersion === requestVersion
      ) {
        setState({
          token: requestToken,
          products,
          status: 'success',
          error: null,
        })
      }
    } catch (error: unknown) {
      if (
        currentTokenRef.current !== requestToken ||
        wishlistRequestVersion !== requestVersion
      ) {
        return
      }
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setState((current) => ({
        token: requestToken,
        products: current.token === requestToken ? current.products : [],
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
      return
    }
    setPendingIds(new Set())
    pendingIdsRef.current.clear()
    void refreshWishlist().catch(() => undefined)
  }, [authStatus, isAuthenticated, token, refreshWishlist])

  const runProductAction = useCallback(
    async (productId: string, operation: 'add' | 'remove') => {
      if (!token || !isAuthenticated || pendingIdsRef.current.has(productId)) {
        return
      }
      const alreadySaved = state.token === token &&
        state.products.some((product) => product._id === productId)
      if (operation === 'add' && alreadySaved) {
        return
      }

      const actionToken = token
      invalidateWishlistRequests()
      pendingIdsRef.current.add(productId)
      setPendingIds(new Set(pendingIdsRef.current))
      try {
        try {
          if (operation === 'add') {
            await addToWishlistRequest(actionToken, productId)
          } else {
            await removeFromWishlistRequest(actionToken, productId)
          }
        } catch (error: unknown) {
          if (error instanceof ApiError && error.status === 401) {
            logout()
          }
          invalidateWishlistRequests()
          if (
            !(error instanceof ApiError && error.status === 401) &&
            currentTokenRef.current === actionToken
          ) {
            await refreshWishlist().catch(() => undefined)
          }
          throw error
        }
        invalidateWishlistRequests()
        if (currentTokenRef.current === actionToken) {
          await refreshWishlist()
        }
      } finally {
        if (currentTokenRef.current === actionToken) {
          pendingIdsRef.current.delete(productId)
          setPendingIds(new Set(pendingIdsRef.current))
        }
      }
    },
    [isAuthenticated, logout, refreshWishlist, state.products, state.token, token],
  )

  const addProduct = useCallback(
    (productId: string) => runProductAction(productId, 'add'),
    [runProductAction],
  )
  const removeProduct = useCallback(
    (productId: string) => runProductAction(productId, 'remove'),
    [runProductAction],
  )

  const products = useMemo(
    () => state.token === token ? state.products : [],
    [state.token, state.products, token],
  )
  const value = useMemo<WishlistContextValue>(
    () => ({
      products,
      loading:
        isAuthenticated &&
        (state.token !== token || state.status === 'loading'),
      error: state.token === token ? state.error : null,
      pendingIds,
      contains: (productId) => products.some((product) => product._id === productId),
      refresh: refreshWishlist,
      add: addProduct,
      remove: removeProduct,
    }),
    [
      products,
      isAuthenticated,
      state.token,
      state.status,
      state.error,
      token,
      pendingIds,
      refreshWishlist,
      addProduct,
      removeProduct,
    ],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

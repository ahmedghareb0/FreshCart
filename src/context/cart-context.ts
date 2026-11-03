import { createContext } from 'react'
import type { CartItem } from '../types/cart'

export type { CartItem } from '../types/cart'

export type CartContextValue = {
  items: CartItem[]
  cartId: string | null
  itemCount: number
  subtotal: number | null
  total: number | null
  loading: boolean
  error: string | null
  pendingIds: ReadonlySet<string>
  clearPending: boolean
  couponPending: boolean
  couponMessage: string | null
  couponError: string | null
  contains: (productId: string) => boolean
  countFor: (productId: string) => number
  refresh: () => Promise<void>
  add: (productId: string) => Promise<void>
  update: (productId: string, count: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  clear: () => Promise<void>
  apply: (couponName: string) => Promise<void>
  clearCouponFeedback: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

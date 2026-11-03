import { createContext } from 'react'
import type { Product } from '../types/entities'

export type WishlistContextValue = {
  products: Product[]
  loading: boolean
  error: string | null
  pendingIds: ReadonlySet<string>
  contains: (productId: string) => boolean
  refresh: () => Promise<void>
  add: (productId: string) => Promise<void>
  remove: (productId: string) => Promise<void>
}

export const WishlistContext = createContext<WishlistContextValue | null>(null)

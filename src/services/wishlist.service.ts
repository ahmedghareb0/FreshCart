import { apiRequest } from './api'

export function getWishlist(
  token: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return apiRequest<unknown>('wishlist', { token, signal })
}

export function addToWishlist(
  token: string,
  productId: string,
): Promise<unknown> {
  return apiRequest<unknown>('wishlist', {
    method: 'POST',
    token,
    body: { productId },
  })
}

export function removeFromWishlist(
  token: string,
  productId: string,
): Promise<unknown> {
  return apiRequest<unknown>(`wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    token,
  })
}

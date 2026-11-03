import { apiRequest } from './api'

const CART_API_BASE = '/api/v2/cart'

export function getCart(token: string, signal?: AbortSignal): Promise<unknown> {
  return apiRequest<unknown>(CART_API_BASE, { token, signal })
}

export function addToCart(token: string, productId: string): Promise<unknown> {
  return apiRequest<unknown>(CART_API_BASE, {
    method: 'POST',
    token,
    body: { productId },
  })
}

export function updateCartItem(
  token: string,
  productId: string,
  count: number,
): Promise<unknown> {
  return apiRequest<unknown>(`${CART_API_BASE}/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    token,
    body: { count },
  })
}

export function removeCartItem(
  token: string,
  productId: string,
): Promise<unknown> {
  return apiRequest<unknown>(`${CART_API_BASE}/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    token,
  })
}

export function clearCart(token: string): Promise<unknown> {
  return apiRequest<unknown>(CART_API_BASE, {
    method: 'DELETE',
    token,
  })
}

export function applyCoupon(
  token: string,
  couponName: string,
): Promise<unknown> {
  return apiRequest<unknown>(`${CART_API_BASE}/applyCoupon`, {
    method: 'PUT',
    token,
    body: { couponName },
  })
}

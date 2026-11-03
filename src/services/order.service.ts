import { apiRequest } from './api'
import type {
  CashOrderRequest,
  CashOrderVersion,
  CashV1OrderRequest,
  CashV2OrderRequest,
  ShippingAddress,
} from '../types/order'

function requireCartId(cartId: string): string {
  const normalizedCartId = cartId.trim()
  if (!normalizedCartId) {
    throw new Error('The cart ID is unavailable; the order was not submitted.')
  }
  return encodeURIComponent(normalizedCartId)
}

function cashOrderRequest(
  address: ShippingAddress,
  version: CashOrderVersion,
): CashOrderRequest {
  if (version === 'v1') {
    const request: CashV1OrderRequest = {
      shippingAddress: {
        details: address.details,
        phone: address.phone,
        city: address.city,
      },
    }
    return request
  }

  const postalCode = address.postalCode?.trim()
  if (!postalCode) {
    throw new Error('A postal code is required for Cash v2 orders.')
  }
  const request: CashV2OrderRequest = {
    shippingAddress: {
      details: address.details,
      phone: address.phone,
      city: address.city,
      postalCode,
    },
  }
  return request
}

export function createCashOrder(
  token: string,
  cartId: string,
  address: ShippingAddress,
  version: CashOrderVersion,
): Promise<unknown> {
  const request = cashOrderRequest(address, version)
  return apiRequest<unknown>(
    `/api/${version}/orders/${requireCartId(cartId)}`,
    {
      method: 'POST',
      token,
      body: request,
    },
  )
}

export function createCheckoutSession(
  token: string,
  cartId: string,
  address: ShippingAddress,
  returnUrl: string,
): Promise<unknown> {
  const normalizedReturnUrl = returnUrl.trim()
  if (!normalizedReturnUrl) {
    throw new Error('A checkout return URL is required.')
  }

  const request: CashV1OrderRequest = {
    shippingAddress: {
      details: address.details,
      phone: address.phone,
      city: address.city,
    },
  }
  return apiRequest<unknown>(
    `/api/v1/orders/checkout-session/${requireCartId(cartId)}`,
    {
      method: 'POST',
      token,
      body: request,
      query: { url: normalizedReturnUrl },
    },
  )
}

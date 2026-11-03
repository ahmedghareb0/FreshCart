import { apiRequest } from './api'
import type {
  OrderHistoryItem,
  OrderProductSummary,
} from '../types/order-history'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function optionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseOrderProduct(value: unknown): OrderProductSummary {
  if (!isRecord(value)) {
    return { id: null, title: null, image: null, count: null, price: null }
  }

  const product = isRecord(value.product) ? value.product : value
  const id = optionalString(product._id) ?? optionalString(product.id)
  const title = optionalString(product.title) ?? optionalString(product.name)
  const image = optionalString(product.imageCover) ?? optionalString(product.image)
  const rawCount = value.count
  const rawPrice = value.price ?? product.price

  return {
    id,
    title,
    image,
    count:
      typeof rawCount === 'number' &&
      Number.isInteger(rawCount) &&
      rawCount > 0
        ? rawCount
        : null,
    price: optionalNumber(rawPrice),
  }
}

function parseOrder(value: unknown): OrderHistoryItem {
  if (!isRecord(value)) {
    throw new Error('An order in the response had an unsupported structure.')
  }

  const id = optionalString(value._id) ?? optionalString(value.id)
  if (!id) {
    throw new Error('An order in the response did not include a valid ID.')
  }

  const rawProducts = Array.isArray(value.cartItems)
    ? value.cartItems
    : Array.isArray(value.products)
      ? value.products
      : []

  return {
    id,
    createdAt: optionalString(value.createdAt),
    status: optionalString(value.status),
    isPaid: typeof value.isPaid === 'boolean' ? value.isPaid : null,
    paymentMethod: optionalString(value.paymentMethodType),
    total: optionalNumber(value.totalOrderPrice),
    products: rawProducts.map(parseOrderProduct),
  }
}

export function parseUserOrders(response: unknown): OrderHistoryItem[] {
  const orders = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : null

  if (!orders) {
    throw new Error('The orders response did not contain a valid order list.')
  }
  return orders.map(parseOrder)
}

export async function getUserOrders(
  token: string,
  userId: string,
  signal?: AbortSignal,
): Promise<OrderHistoryItem[]> {
  const normalizedUserId = userId.trim()
  if (!normalizedUserId) {
    throw new Error('A valid user ID is required to load order history.')
  }

  const response = await apiRequest<unknown>(
    `/api/v1/orders/user/${encodeURIComponent(normalizedUserId)}`,
    { token, signal },
  )
  return parseUserOrders(response)
}

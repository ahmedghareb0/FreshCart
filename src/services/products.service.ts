import type { Product } from '../types/entities'
import type { EntityResponse, PaginatedResponse } from '../types/api'
import { apiRequest } from './api'
import {
  isProduct,
  parseEntityResponse,
  parsePaginatedResponse,
} from './response-validation'

export type ProductSort =
  | 'price'
  | '-price'
  | 'ratingsAverage'
  | '-ratingsAverage'

export type ProductQuery = {
  page: number
  limit: number
  sort?: ProductSort
  priceGte?: number
  priceLte?: number
  brand?: string
  category?: string
}

function productQueryParameters(query: ProductQuery) {
  return {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    'price[gte]': query.priceGte,
    'price[lte]': query.priceLte,
    brand: query.brand,
    'category[in]': query.category,
  }
}

export async function getProducts(
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  const response = await apiRequest<unknown>('products', {
    query: productQueryParameters(query),
    signal,
  })
  return parsePaginatedResponse(response, isProduct, 'products')
}

export async function getProduct(
  productId: string,
  signal?: AbortSignal,
): Promise<EntityResponse<Product>> {
  const response = await apiRequest<unknown>(
    `products/${encodeURIComponent(productId)}`,
    { signal },
  )
  return parseEntityResponse(response, isProduct, 'product details')
}

export async function searchProducts(
  keyword: string,
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Product>> {
  // Keep this separate from the listing UI until keyword matching is verified.
  const response = await apiRequest<unknown>('products', {
    query: { ...productQueryParameters(query), keyword },
    signal,
  })
  return parsePaginatedResponse(response, isProduct, 'products')
}

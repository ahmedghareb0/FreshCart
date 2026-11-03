import type { EntityResponse, PaginatedResponse } from '../types/api'
import type { Brand } from '../types/entities'
import { apiRequest } from './api'
import {
  isBrand,
  parseEntityResponse,
  parsePaginatedResponse,
} from './response-validation'

export async function getBrands(
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Brand>> {
  const response = await apiRequest<unknown>('brands', {
    query: { page, limit },
    signal,
  })
  return parsePaginatedResponse(response, isBrand, 'brands')
}

export async function getBrand(
  brandId: string,
  signal?: AbortSignal,
): Promise<EntityResponse<Brand>> {
  const response = await apiRequest<unknown>(
    `brands/${encodeURIComponent(brandId)}`,
    { signal },
  )
  return parseEntityResponse(response, isBrand, 'brand details')
}

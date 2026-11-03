import type { EntityResponse, PaginatedResponse } from '../types/api'
import type { Category } from '../types/entities'
import { apiRequest } from './api'
import {
  isCategory,
  parseEntityResponse,
  parsePaginatedResponse,
} from './response-validation'

export async function getCategories(
  page: number,
  limit: number,
  signal?: AbortSignal,
): Promise<PaginatedResponse<Category>> {
  const response = await apiRequest<unknown>('categories', {
    query: { page, limit },
    signal,
  })
  return parsePaginatedResponse(response, isCategory, 'categories')
}

export async function getCategory(
  categoryId: string,
  signal?: AbortSignal,
): Promise<EntityResponse<Category>> {
  const response = await apiRequest<unknown>(
    `categories/${encodeURIComponent(categoryId)}`,
    { signal },
  )
  return parseEntityResponse(response, isCategory, 'category details')
}

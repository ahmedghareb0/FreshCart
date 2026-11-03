import { apiRequest } from './api'
import type { Brand, Category } from '../types/entities'
import {
  isBrand,
  isCategory,
  parsePaginatedResponse,
} from './response-validation'

async function getAllPages<T>(
  path: string,
  isItem: (item: unknown) => item is T,
  resourceName: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const firstResponse = await apiRequest<unknown>(path, { signal })
  const firstPage = parsePaginatedResponse(firstResponse, isItem, resourceName)
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.metadata.numberOfPages - firstPage.metadata.currentPage) },
    (_, index) => firstPage.metadata.currentPage + index + 1,
  )
  const pages = await Promise.all(
    remainingPages.map(async (page) => {
      const response = await apiRequest<unknown>(path, {
        query: { page, limit: firstPage.metadata.limit },
        signal,
      })
      return parsePaginatedResponse(response, isItem, resourceName)
    }),
  )

  return [firstPage, ...pages].flatMap((response) => response.data)
}

export async function getProductFilterOptions(
  signal?: AbortSignal,
): Promise<{ brands: Brand[]; categories: Category[] }> {
  const [brands, categories] = await Promise.all([
    getAllPages<Brand>('brands', isBrand, 'brands', signal),
    getAllPages<Category>('categories', isCategory, 'categories', signal),
  ])

  return { brands, categories }
}

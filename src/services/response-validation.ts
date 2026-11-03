import type {
  EntityResponse,
  PaginatedResponse,
  PaginationMetadata,
} from '../types/api'
import type { Brand, Category, Product } from '../types/entities'
import { InvalidResponseError } from './api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isCatalogReference(
  value: unknown,
): value is Pick<Category, '_id' | 'name' | 'slug' | 'image'> {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.slug) &&
    typeof value.image === 'string'
}

export function isCatalogEntity(value: unknown): value is Category | Brand {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.slug) &&
    typeof value.image === 'string' &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
}

export function isProduct(value: unknown): value is Product {
  return isRecord(value) &&
    isNonEmptyString(value._id) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.slug) &&
    typeof value.description === 'string' &&
    isFiniteNumber(value.quantity) &&
    isFiniteNumber(value.price) &&
    value.price >= 0 &&
    typeof value.imageCover === 'string' &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === 'string') &&
    isFiniteNumber(value.sold) &&
    isFiniteNumber(value.ratingsAverage) &&
    isFiniteNumber(value.ratingsQuantity) &&
    isCatalogReference(value.category) &&
    isCatalogReference(value.brand) &&
    Array.isArray(value.subcategory) &&
    value.subcategory.every((subcategory) =>
      isRecord(subcategory) &&
      isNonEmptyString(subcategory._id) &&
      isNonEmptyString(subcategory.name) &&
      isNonEmptyString(subcategory.slug) &&
      isNonEmptyString(subcategory.category)
    ) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
}

function isPaginationMetadata(value: unknown): value is PaginationMetadata {
  return isRecord(value) &&
    typeof value.currentPage === 'number' &&
    Number.isInteger(value.currentPage) &&
    value.currentPage >= 1 &&
    typeof value.numberOfPages === 'number' &&
    Number.isInteger(value.numberOfPages) &&
    value.numberOfPages >= 0 &&
    typeof value.limit === 'number' &&
    Number.isInteger(value.limit) &&
    value.limit >= 1 &&
    (
      value.nextPage === undefined ||
      (
        typeof value.nextPage === 'number' &&
        Number.isInteger(value.nextPage) &&
        value.nextPage >= 1
      )
    )
}

function isPaginatedResponse<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
): value is PaginatedResponse<T> {
  return isRecord(value) &&
    typeof value.results === 'number' &&
    Number.isInteger(value.results) &&
    value.results >= 0 &&
    isPaginationMetadata(value.metadata) &&
    Array.isArray(value.data) &&
    value.data.every(isItem)
}

export function parsePaginatedResponse<T>(
  value: unknown,
  isItem: (item: unknown) => item is T,
  resourceName: string,
): PaginatedResponse<T> {
  if (!isPaginatedResponse(value, isItem)) {
    throw new InvalidResponseError(
      `The ${resourceName} response did not match the expected paginated structure.`,
    )
  }
  return value
}

function isEntityResponse<T>(
  value: unknown,
  isEntity: (entity: unknown) => entity is T,
): value is EntityResponse<T> {
  return isRecord(value) && isEntity(value.data)
}

export function parseEntityResponse<T>(
  value: unknown,
  isEntity: (entity: unknown) => entity is T,
  resourceName: string,
): EntityResponse<T> {
  if (!isEntityResponse(value, isEntity)) {
    throw new InvalidResponseError(
      `The ${resourceName} response did not contain a valid entity.`,
    )
  }
  return value
}

export function isCategory(value: unknown): value is Category {
  return isCatalogEntity(value)
}

export function isBrand(value: unknown): value is Brand {
  return isCatalogEntity(value)
}

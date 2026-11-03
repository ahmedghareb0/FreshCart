export type PaginationMetadata = {
  currentPage: number
  numberOfPages: number
  limit: number
  nextPage?: number
}

export type PaginatedResponse<T> = {
  results: number
  metadata: PaginationMetadata
  data: T[]
}

export type EntityResponse<T> = {
  data: T
}

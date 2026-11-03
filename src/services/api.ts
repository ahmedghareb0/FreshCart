export const API_BASE_URL = 'https://ecommerce.routemisr.com/api/v1'

export type QueryParameterValue =
  | string
  | number
  | boolean
  | null
  | undefined

export type QueryParameters =
  | Record<string, QueryParameterValue | readonly (string | number | boolean)[]>
  | URLSearchParams

export type ApiRequestOptions = {
  method?: string
  headers?: HeadersInit
  query?: QueryParameters
  body?: unknown
  token?: string
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly responseBody: unknown

  constructor(status: number, responseBody: unknown) {
    super(`API request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.responseBody = responseBody
  }
}

export class NetworkError extends Error {
  readonly originalError: unknown

  constructor(originalError: unknown) {
    super('The network request failed.')
    this.name = 'NetworkError'
    this.originalError = originalError
  }
}

export class InvalidResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidResponseError'
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

function isBlob(body: unknown): body is Blob {
  return typeof Blob !== 'undefined' && body instanceof Blob
}

function buildUrl(path: string, query?: QueryParameters): URL {
  const url = path.startsWith('/api/')
    ? new URL(path, API_BASE_URL)
    : new URL(
        `${API_BASE_URL}/${path.replace(/^\/+/, '')}`,
        `${API_BASE_URL}/`,
      )

  if (query instanceof URLSearchParams) {
    query.forEach((value, key) => url.searchParams.append(key, value))
  } else {
    for (const [key, value] of Object.entries(query ?? {})) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          url.searchParams.append(key, String(entry))
        }
      } else if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()
  if (!text) {
    return undefined
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (options.token) {
    headers.set('token', options.token)
  }

  if (options.body !== undefined) {
    if (isFormData(options.body) || isBlob(options.body)) {
      body = options.body
    } else if (typeof options.body === 'string') {
      body = options.body
    } else {
      body = JSON.stringify(options.body)
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
      }
    }
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new NetworkError(error)
  }

  let responseBody: unknown
  try {
    responseBody = await parseResponseBody(response)
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    throw new NetworkError(error)
  }

  if (!response.ok) {
    throw new ApiError(response.status, responseBody)
  }

  return responseBody as T
}

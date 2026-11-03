import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../../services/api'
import type { PaginatedResponse } from '../../types/api'
import { ErrorMessage } from './ErrorMessage'
import { Loading } from './Loading'
import { PaginationControls } from './PaginationControls'

const PAGE_LIMIT = 12

type EntityCollectionPageProps<T> = {
  title: string
  description: string
  resourceName: string
  fetchPage: (
    page: number,
    limit: number,
    signal?: AbortSignal,
  ) => Promise<PaginatedResponse<T>>
  renderCard: (entity: T) => ReactNode
  getKey: (entity: T) => string
}

function requestError(error: unknown, resourceName: string): string {
  if (error instanceof ApiError) {
    return `Could not load ${resourceName} (HTTP ${error.status}). Please try again.`
  }
  if (error instanceof InvalidResponseError) {
    return error.message
  }
  if (error instanceof NetworkError) {
    return `Could not load ${resourceName} because the network request failed.`
  }
  return `Could not load ${resourceName}. Check your connection and try again.`
}

export function EntityCollectionPage<T>({
  title,
  description,
  resourceName,
  fetchPage,
  renderCard,
  getKey,
}: EntityCollectionPageProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [retryCount, setRetryCount] = useState(0)
  const [resultState, setResultState] = useState<{
    key: string
    response?: PaginatedResponse<T>
    error?: string
  }>({ key: '' })
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const requestKey = `${page}:${retryCount}`

  useEffect(() => {
    const controller = new AbortController()
    fetchPage(page, PAGE_LIMIT, controller.signal)
      .then((response) => setResultState({ key: requestKey, response }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResultState({
            key: requestKey,
            error: requestError(error, resourceName),
          })
        }
      })

    return () => controller.abort()
  }, [fetchPage, page, requestKey, resourceName])

  const response =
    resultState.key === requestKey ? resultState.response : undefined
  const error = resultState.key === requestKey ? resultState.error : undefined
  const isLoading = resultState.key !== requestKey

  function changePage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (nextPage > 1) {
        next.set('page', String(nextPage))
      } else {
        next.delete('page')
      }
      return next
    })
  }

  return (
    <section className="entity-page" aria-labelledby="entity-page-title">
      <header className="products-page__heading">
        <div>
          <p className="eyebrow">FreshCart</p>
          <h1 id="entity-page-title">{title}</h1>
          <p className="products-page__intro">{description}</p>
        </div>
        {response && (
          <p className="products-page__count">
            {response.results} {resourceName}
          </p>
        )}
      </header>

      {error ? (
        <div className="products-state">
          <ErrorMessage message={error} />
          <button
            className="button button--outline"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      ) : isLoading ? (
        <Loading />
      ) : !response || response.data.length === 0 ? (
        <div className="empty-state">
          <h2>No {resourceName} found</h2>
          <p>There are no {resourceName} to display right now.</p>
        </div>
      ) : (
        <>
          <div className="entity-grid">
            {response.data.map((entity) => (
              <div key={getKey(entity)}>{renderCard(entity)}</div>
            ))}
          </div>
          <PaginationControls
            currentPage={response.metadata.currentPage}
            numberOfPages={response.metadata.numberOfPages}
            onPageChange={changePage}
          />
        </>
      )}
    </section>
  )
}

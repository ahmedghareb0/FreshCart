import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../../services/api'
import { RelatedProducts } from '../products/RelatedProducts'
import type { EntityResponse } from '../../types/api'
import type { Brand, Category } from '../../types/entities'
import { ErrorMessage } from './ErrorMessage'
import { Loading } from './Loading'

export type CatalogEntity = Brand | Category
export type EntityFetcher<T extends CatalogEntity> = (
  id: string,
  signal?: AbortSignal,
) => Promise<EntityResponse<T>>

type EntityDetailsPageProps<T extends CatalogEntity> = {
  id: string | undefined
  kind: 'brand' | 'category'
  fetchEntity: EntityFetcher<T>
}

const ID_PATTERN = /^[a-f\d]{24}$/i

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'This item could not be found.'
  }
  if (error instanceof ApiError) {
    return `Could not load this item (HTTP ${error.status}). Please try again.`
  }
  if (error instanceof InvalidResponseError) {
    return error.message
  }
  if (error instanceof NetworkError) {
    return 'Could not load this item because the network request failed.'
  }
  return 'Could not load this item. Check your connection and try again.'
}

export function EntityDetailsPage<T extends CatalogEntity>({
  id,
  kind,
  fetchEntity,
}: EntityDetailsPageProps<T>) {
  const [retryCount, setRetryCount] = useState(0)
  const [resultState, setResultState] = useState<{
    key: string
    entity?: T
    error?: string
  }>({ key: '' })
  const requestKey = `${id ?? ''}:${retryCount}`
  const isValidId = Boolean(id && ID_PATTERN.test(id))
  const collectionLabel = kind === 'category' ? 'categories' : 'brands'
  const collectionPath = `/${collectionLabel}`

  useEffect(() => {
    if (!id || !ID_PATTERN.test(id)) {
      return
    }

    const controller = new AbortController()
    fetchEntity(id, controller.signal)
      .then(({ data }) => setResultState({ key: requestKey, entity: data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResultState({
            key: requestKey,
            error: getErrorMessage(error),
          })
        }
      })

    return () => controller.abort()
  }, [fetchEntity, id, requestKey])

  if (!isValidId || !id) {
    return (
      <section className="entity-detail-state">
        <ErrorMessage message="This link is invalid." />
        <Link className="button button--outline" to={collectionPath}>
          Back to {collectionLabel}
        </Link>
      </section>
    )
  }

  const entity =
    resultState.key === requestKey ? resultState.entity : undefined
  const error =
    resultState.key === requestKey ? resultState.error : undefined

  if (error) {
    return (
      <section className="entity-detail-state">
        <ErrorMessage message={error} />
        {error !== 'This item could not be found.' && (
          <button
            className="button button--outline"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        )}
        <Link className="text-link" to={collectionPath}>
          Back to {collectionLabel}
        </Link>
      </section>
    )
  }

  if (!entity) {
    return <Loading />
  }

  const productsFilter = kind === 'category'
    ? { category: entity._id }
    : { brand: entity._id }

  return (
    <section className="entity-details" aria-labelledby="entity-details-title">
      <Link className="text-link entity-details__back" to={collectionPath}>
        ← Back to {kind === 'category' ? 'categories' : 'brands'}
      </Link>
      <header className="entity-details__header">
        <div className="entity-details__image">
          <img src={entity.image} alt={entity.name} />
        </div>
        <div>
          <p className="eyebrow">FreshCart {kind}</p>
          <h1 id="entity-details-title">{entity.name}</h1>
        </div>
      </header>
      <RelatedProducts filter={productsFilter} />
    </section>
  )
}

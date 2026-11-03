import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../../services/api'
import { getProducts } from '../../services/products.service'
import type { ProductQuery } from '../../services/products.service'
import type { PaginatedResponse } from '../../types/api'
import type { Product } from '../../types/entities'
import { ErrorMessage } from '../common/ErrorMessage'
import { Loading } from '../common/Loading'
import { PaginationControls } from '../common/PaginationControls'
import { ProductCard } from './ProductCard'

const PAGE_LIMIT = 12

type RelatedProductsProps = {
  filter: { category: string } | { brand: string }
}

export function RelatedProducts({ filter }: RelatedProductsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [retryCount, setRetryCount] = useState(0)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const category = 'category' in filter ? filter.category : undefined
  const brand = 'brand' in filter ? filter.brand : undefined
  const filterKey = category ? `category:${category}` : `brand:${brand}`
  const requestKey = `${filterKey}:${page}:${retryCount}`
  const [resultState, setResultState] = useState<{
    key: string
    response?: PaginatedResponse<Product>
    error?: string
  }>({ key: '' })

  useEffect(() => {
    const controller = new AbortController()
    const query: ProductQuery = {
      page,
      limit: PAGE_LIMIT,
      ...(category ? { category } : { brand }),
    }

    getProducts(query, controller.signal)
      .then((response) => setResultState({ key: requestKey, response }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        const message = error instanceof ApiError
          ? `Could not load related products (HTTP ${error.status}).`
          : error instanceof InvalidResponseError
            ? error.message
            : error instanceof NetworkError
              ? 'Could not load related products because the network request failed.'
              : 'Could not load related products. Check your connection and try again.'
        setResultState({ key: requestKey, error: message })
      })

    return () => controller.abort()
  }, [brand, category, page, requestKey])

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
    <section className="related-products" aria-labelledby="related-products-title">
      <header className="section-heading">
        <h2 id="related-products-title">Related products</h2>
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
          <h3>No related products found</h3>
          <p>There are no products available in this collection right now.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {response.data.map((product) => (
              <ProductCard key={product._id} product={product} />
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

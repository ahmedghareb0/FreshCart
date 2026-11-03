import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { ProductCard } from '../components/products/ProductCard'
import { getProductFilterOptions } from '../services/product-filters.service'
import { getProducts } from '../services/products.service'
import type { ProductQuery, ProductSort } from '../services/products.service'
import type { PaginatedResponse } from '../types/api'
import type { Brand, Category, Product } from '../types/entities'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../services/api'

const DEFAULT_LIMIT = 12
const PRODUCT_SORTS: { value: ProductSort; label: string }[] = [
  { value: 'price', label: 'Price: low to high' },
  { value: '-price', label: 'Price: high to low' },
  { value: 'ratingsAverage', label: 'Rating: low to high' },
  { value: '-ratingsAverage', label: 'Rating: high to low' },
]

function getErrorMessage(error: unknown, resource: string): string {
  if (error instanceof ApiError) {
    return `Could not load ${resource} (HTTP ${error.status}). Please try again.`
  }
  if (error instanceof InvalidResponseError) {
    return error.message
  }
  if (error instanceof NetworkError) {
    return `Could not load ${resource} because the network request failed.`
  }

  return `Could not load ${resource}. Check your connection and try again.`
}

function parsePositiveNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === '') {
    return undefined
  }

  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

type PriceFilterProps = {
  initialMin: string
  initialMax: string
  onApply: (min: string, max: string) => void
}

function PriceFilter({ initialMin, initialMax, onApply }: PriceFilterProps) {
  const [minPrice, setMinPrice] = useState(initialMin)
  const [maxPrice, setMaxPrice] = useState(initialMax)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const lower = parsePositiveNumber(minPrice === '' ? null : minPrice)
    const upper = parsePositiveNumber(maxPrice === '' ? null : maxPrice)
    if ((minPrice !== '' && lower === undefined) ||
      (maxPrice !== '' && upper === undefined)) {
      setError('Enter valid non-negative prices.')
      return
    }
    if (lower !== undefined && upper !== undefined && lower > upper) {
      setError('Minimum price cannot be higher than maximum price.')
      return
    }

    onApply(minPrice, maxPrice)
  }

  return (
    <form className="filter-field price-filter" onSubmit={handleSubmit}>
      <span>Price range (EGP)</span>
      <div className="price-filter__inputs">
        <input
          type="number"
          min="0"
          step="any"
          aria-label="Minimum price"
          placeholder="Min"
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
        />
        <input
          type="number"
          min="0"
          step="any"
          aria-label="Maximum price"
          placeholder="Max"
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
        />
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="button button--outline price-filter__apply" type="submit">
        Apply price
      </button>
    </form>
  )
}

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [productState, setProductState] = useState<{
    key: string
    response?: PaginatedResponse<Product>
    error?: string
  }>({ key: '' })
  const [retryCount, setRetryCount] = useState(0)
  const [filtersRetryCount, setFiltersRetryCount] = useState(0)
  const [filtersState, setFiltersState] = useState<{
    attempt: number
    status: 'loading' | 'ready' | 'error'
    brands: Brand[]
    categories: Category[]
    error?: string
  }>({
    attempt: -1,
    status: 'loading',
    brands: [],
    categories: [],
  })

  const filterKey = searchParams.toString()
  const productRequestKey = `${filterKey}:${retryCount}`
  const query = useMemo<ProductQuery>(() => {
    const params = new URLSearchParams(filterKey)
    const sort = params.get('sort')

    return {
      page: Math.max(1, Number(params.get('page')) || 1),
      limit: Math.max(1, Number(params.get('limit')) || DEFAULT_LIMIT),
      sort: PRODUCT_SORTS.find((option) => option.value === sort)?.value,
      priceGte: parsePositiveNumber(params.get('price[gte]')),
      priceLte: parsePositiveNumber(params.get('price[lte]')),
      brand: params.get('brand') || undefined,
      category: params.get('category[in]') || undefined,
    }
  }, [filterKey])

  useEffect(() => {
    const controller = new AbortController()

    getProducts(query, controller.signal)
      .then((response) => {
        setProductState({ key: productRequestKey, response })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setProductState({
            key: productRequestKey,
            error: getErrorMessage(error, 'products'),
          })
        }
      })

    return () => controller.abort()
  }, [query, productRequestKey])

  useEffect(() => {
    const controller = new AbortController()

    getProductFilterOptions(controller.signal)
      .then(({ brands, categories }) => {
        setFiltersState({
          attempt: filtersRetryCount,
          status: 'ready',
          brands,
          categories,
        })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFiltersState({
            attempt: filtersRetryCount,
            status: 'error',
            brands: [],
            categories: [],
            error: getErrorMessage(error, 'filter options'),
          })
        }
      })

    return () => controller.abort()
  }, [filtersRetryCount])

  const response =
    productState.key === productRequestKey ? productState.response : undefined
  const loadError =
    productState.key === productRequestKey ? productState.error : undefined
  const isLoading = productState.key !== productRequestKey
  const filtersLoading =
    filtersState.attempt !== filtersRetryCount ||
    filtersState.status === 'loading'
  const filtersError =
    filtersState.attempt === filtersRetryCount ? filtersState.error : undefined

  function updateQuery(key: string, value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('page')
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function handlePriceApply(minPrice: string, maxPrice: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('page')
      if (minPrice) {
        next.set('price[gte]', minPrice)
      } else {
        next.delete('price[gte]')
      }
      if (maxPrice) {
        next.set('price[lte]', maxPrice)
      } else {
        next.delete('price[lte]')
      }
      return next
    })
  }

  function goToPage(page: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (page > 1) {
        next.set('page', String(page))
      } else {
        next.delete('page')
      }
      return next
    })
  }

  const metadata = response?.metadata
  const currentPage = metadata?.currentPage ?? query.page
  const numberOfPages = metadata?.numberOfPages ?? 1

  return (
    <section className="products-page" aria-labelledby="products-heading">
      <header className="products-page__heading">
        <div>
          <p className="eyebrow">FreshCart shop</p>
          <h1 id="products-heading">Our Products</h1>
          <p className="products-page__intro">
            Find everyday favorites from the FreshCart collection.
          </p>
        </div>
        {response && (
          <p className="products-page__count">
            {response.results} {response.results === 1 ? 'product' : 'products'}
          </p>
        )}
      </header>

      <div className="product-catalog">
        <aside className="product-filters" aria-label="Product filters">
          <div className="product-filters__heading">
            <h2>Filters</h2>
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setSearchParams(new URLSearchParams())
              }}
            >
              Clear all
            </button>
          </div>

          <label className="filter-field">
            <span>Sort by</span>
            <select
              value={query.sort ?? ''}
              onChange={(event) => updateQuery('sort', event.target.value)}
            >
              <option value="">Default order</option>
              {PRODUCT_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Products per page</span>
            <select
              value={query.limit}
              onChange={(event) => updateQuery('limit', event.target.value)}
            >
              {[12, 24, 40].map((limit) => (
                <option key={limit} value={limit}>{limit}</option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Category</span>
            <select
              value={query.category ?? ''}
              onChange={(event) => updateQuery('category[in]', event.target.value)}
              disabled={filtersLoading || filtersState.categories.length === 0}
            >
              <option value="">All categories</option>
              {filtersState.categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Brand</span>
            <select
              value={query.brand ?? ''}
              onChange={(event) => updateQuery('brand', event.target.value)}
              disabled={filtersLoading || filtersState.brands.length === 0}
            >
              <option value="">All brands</option>
              {filtersState.brands.map((brand) => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>

          <PriceFilter
            key={filterKey}
            initialMin={searchParams.get('price[gte]') ?? ''}
            initialMax={searchParams.get('price[lte]') ?? ''}
            onApply={handlePriceApply}
          />

          {filtersError && (
            <div className="filter-error" role="alert">
              <p>{filtersError}</p>
              <button
                className="text-button"
                type="button"
                onClick={() => setFiltersRetryCount((count) => count + 1)}
              >
                Retry
              </button>
            </div>
          )}
        </aside>

        <div className="product-results" aria-live="polite">
          {loadError ? (
            <div className="products-state">
              <ErrorMessage message={loadError} />
              <button
                className="button button--outline"
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Try again
              </button>
            </div>
          ) : isLoading || !response ? (
            <Loading />
          ) : response.data.length === 0 ? (
            <div className="empty-state">
              <h2>No products found</h2>
              <p>Try changing or clearing your filters.</p>
            </div>
          ) : (
            <>
              <div className="product-grid">
                {response.data.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
              {numberOfPages > 1 && (
                <nav className="pagination" aria-label="Product pages">
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </button>
                  <span>
                    Page {currentPage} of {numberOfPages}
                  </span>
                  <button
                    className="pagination__button"
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= numberOfPages}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandCard } from '../components/brands/BrandCard'
import { CategoryCard } from '../components/categories/CategoryCard'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { ProductCard } from '../components/products/ProductCard'
import { getBrands } from '../services/brands.service'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../services/api'
import { getCategories } from '../services/categories.service'
import { getProducts } from '../services/products.service'
import type { PaginatedResponse } from '../types/api'
import type { Brand, Category, Product } from '../types/entities'

type ResourceState<T> = {
  key: number
  data?: T
  error?: string
}

function useHomeResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
): {
  data: T | undefined
  error: string | undefined
  loading: boolean
  retry: () => void
} {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<ResourceState<T>>({ key: -1 })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => setState({ key: attempt, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }

        const message = error instanceof ApiError
          ? `The request failed (HTTP ${error.status}).`
          : error instanceof InvalidResponseError
            ? error.message
            : error instanceof NetworkError
              ? 'The network request failed. Check your connection and try again.'
              : 'Check your connection and try again.'
        setState({ key: attempt, error: message })
      })

    return () => controller.abort()
  }, [attempt, load])

  const isCurrentAttempt = state.key === attempt
  return {
    data: isCurrentAttempt ? state.data : undefined,
    error: isCurrentAttempt ? state.error : undefined,
    loading: !isCurrentAttempt,
    retry: () => setAttempt((current) => current + 1),
  }
}

const loadCategories = (signal: AbortSignal) =>
  getCategories(1, 10, signal)

const loadBrands = (signal: AbortSignal) =>
  getBrands(1, 12, signal)

const loadProducts = (signal: AbortSignal) =>
  getProducts({ page: 1, limit: 40 }, signal)

function SectionHeading({
  eyebrow,
  title,
  description,
  to,
  linkText,
}: {
  eyebrow?: string
  title: string
  description?: string
  to?: string
  linkText?: string
}) {
  return (
    <div className="home-section__heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="home-section__description">{description}</p>}
      </div>
      {to && linkText && (
        <Link className="home-section__link" to={to}>
          {linkText} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  )
}

function RetryState({
  error,
  retry,
}: {
  error: string
  retry: () => void
}) {
  return (
    <div className="home-resource-state">
      <ErrorMessage message={error} />
      <button className="button button--outline" type="button" onClick={retry}>
        Try again
      </button>
    </div>
  )
}

function HomeProductSection({
  title,
  description,
  products,
  loading,
  error,
  retry,
  viewAll,
}: {
  title: string
  description: string
  products: Product[] | undefined
  loading: boolean
  error: string | undefined
  retry: () => void
  viewAll?: boolean
}) {
  return (
    <section className="home-section" aria-label={title}>
      <SectionHeading
        title={title}
        description={description}
        to={viewAll ? '/products' : undefined}
        linkText={viewAll ? 'View all products' : undefined}
      />
      {error ? (
        <RetryState error={error} retry={retry} />
      ) : loading ? (
        <Loading />
      ) : !products || products.length === 0 ? (
        <div className="empty-state">
          <h3>No products available</h3>
          <p>There are no products to show right now.</p>
        </div>
      ) : (
        <div className="product-grid home-product-grid">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

export function HomePage() {
  const categoriesResource = useHomeResource<PaginatedResponse<Category>>(
    loadCategories,
  )
  const brandsResource = useHomeResource<PaginatedResponse<Brand>>(loadBrands)
  const productsResource = useHomeResource<PaginatedResponse<Product>>(loadProducts)

  const products = productsResource.data?.data ?? []
  const featuredProducts = products.slice(0, 8)
  const bestSellers = [...products]
    .sort((left, right) => right.sold - left.sold)
    .slice(0, 4)
  const newArrivals = [...products]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 4)
  const heroProduct = featuredProducts[0]

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">Everyday shopping, made simple</p>
          <h1 id="home-hero-title">A little more fresh in every day.</h1>
          <p className="home-hero__description">
            Explore useful finds, trusted brands, and everyday favorites all in
            one place.
          </p>
          <Link className="button button--solid home-hero__cta" to="/products">
            Shop all products
          </Link>
          <div className="home-hero__notes" aria-label="Store highlights">
            <span>Thoughtful finds</span>
            <span>Easy browsing</span>
            <span>New discoveries</span>
          </div>
        </div>
        <div className="home-hero__visual">
          {heroProduct ? (
            <Link
              className="home-hero__product"
              to={`/products/${encodeURIComponent(heroProduct._id)}`}
              aria-label={`Explore ${heroProduct.title}`}
            >
              <span className="home-hero__product-label">A FreshCart find</span>
              <img src={heroProduct.imageCover} alt={heroProduct.title} />
            </Link>
          ) : (
            <div className="home-hero__shape" aria-hidden="true">
              <span>F</span>
            </div>
          )}
          <span className="home-hero__decor home-hero__decor--one" aria-hidden="true" />
          <span className="home-hero__decor home-hero__decor--two" aria-hidden="true" />
        </div>
      </section>

      <section className="home-section" aria-label="Featured categories">
        <SectionHeading
          eyebrow="Browse your way"
          title="Shop by category"
          description="Start with the things you need, or find something new."
          to="/categories"
          linkText="All categories"
        />
        {categoriesResource.error ? (
          <RetryState
            error={categoriesResource.error}
            retry={categoriesResource.retry}
          />
        ) : categoriesResource.loading ? (
          <Loading />
        ) : !categoriesResource.data?.data.length ? (
          <div className="empty-state">
            <h3>No categories available</h3>
            <p>Categories are unavailable right now.</p>
          </div>
        ) : (
          <div className="entity-grid home-category-grid">
            {categoriesResource.data.data.slice(0, 6).map((category) => (
              <div key={category._id}>
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        )}
      </section>

      <HomeProductSection
        title="Featured products"
        description="A few picks from the products currently available."
        products={productsResource.data ? featuredProducts : undefined}
        loading={productsResource.loading}
        error={productsResource.error}
        retry={productsResource.retry}
        viewAll
      />

      <section className="home-promotions" aria-label="Shop FreshCart">
        <article className="home-promo home-promo--green">
          <p className="eyebrow">Your next favorite</p>
          <h2>Good things are easier to find.</h2>
          <p>Browse brands and discover products selected from the live catalog.</p>
          <Link className="button button--promo" to="/brands">
            Explore brands
          </Link>
        </article>
        <article className="home-promo home-promo--sand">
          <p className="eyebrow">A fresh perspective</p>
          <h2>Make room for everyday essentials.</h2>
          <p>Explore collections for home, style, technology, and more.</p>
          <Link className="button button--promo" to="/categories">
            Browse categories
          </Link>
        </article>
      </section>

      <HomeProductSection
        title="Best sellers"
        description="Popular products, ranked by the catalog’s reported sales."
        products={productsResource.data ? bestSellers : undefined}
        loading={productsResource.loading}
        error={productsResource.error}
        retry={productsResource.retry}
      />

      <section className="home-section" aria-label="Featured brands">
        <SectionHeading
          eyebrow="Brands to know"
          title="Find your favorites"
          description="Browse brands available in the FreshCart catalog."
          to="/brands"
          linkText="All brands"
        />
        {brandsResource.error ? (
          <RetryState error={brandsResource.error} retry={brandsResource.retry} />
        ) : brandsResource.loading ? (
          <Loading />
        ) : !brandsResource.data?.data.length ? (
          <div className="empty-state">
            <h3>No brands available</h3>
            <p>Brands are unavailable right now.</p>
          </div>
        ) : (
          <div className="entity-grid home-brand-grid">
            {brandsResource.data.data.slice(0, 6).map((brand) => (
              <div key={brand._id}>
                <BrandCard brand={brand} />
              </div>
            ))}
          </div>
        )}
      </section>

      <HomeProductSection
        title="New arrivals"
        description="Products ordered by their available creation dates."
        products={productsResource.data ? newArrivals : undefined}
        loading={productsResource.loading}
        error={productsResource.error}
        retry={productsResource.retry}
        viewAll
      />

      <section className="home-newsletter" aria-labelledby="newsletter-title">
        <div>
          <p className="eyebrow">Stay in the loop</p>
          <h2 id="newsletter-title">A fresh note from FreshCart.</h2>
          <p>
            Newsletter sign-up is coming soon. For now, explore the latest
            products and collections.
          </p>
        </div>
        <Link className="button button--outline" to="/products">
          Explore the shop
        </Link>
      </section>
    </div>
  )
}

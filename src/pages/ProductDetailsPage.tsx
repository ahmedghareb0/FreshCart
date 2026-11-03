import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError,
  InvalidResponseError,
  NetworkError,
} from '../services/api'
import { getProduct } from '../services/products.service'
import type { Product } from '../types/entities'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { AddToCartButton } from '../components/cart/AddToCartButton'
import { WishlistButton } from '../components/wishlist/WishlistButton'

const priceFormatter = new Intl.NumberFormat('en-EG', {
  maximumFractionDigits: 2,
})

const PRODUCT_ID_PATTERN = /^[a-f\d]{24}$/i

export function ProductDetailsPage() {
  const { productId } = useParams()
  const [productState, setProductState] = useState<{
    key: string
    product?: Product
    error?: string
  }>({ key: '' })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const isValidId = Boolean(productId && PRODUCT_ID_PATTERN.test(productId))
  const requestKey = `${productId ?? ''}:${retryCount}`

  useEffect(() => {
    if (!productId || !PRODUCT_ID_PATTERN.test(productId)) {
      return
    }

    const controller = new AbortController()
    getProduct(productId, controller.signal)
      .then(({ data }) => {
        setProductState({ key: requestKey, product: data })
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        if (requestError instanceof ApiError && requestError.status === 404) {
          setProductState({
            key: requestKey,
            error: 'This product could not be found.',
          })
          return
        }
        if (requestError instanceof ApiError) {
          setProductState({
            key: requestKey,
            error: `Could not load this product (HTTP ${requestError.status}).`,
          })
          return
        }
        if (requestError instanceof InvalidResponseError) {
          setProductState({ key: requestKey, error: requestError.message })
          return
        }
        if (requestError instanceof NetworkError) {
          setProductState({
            key: requestKey,
            error: 'Could not load this product because the network request failed.',
          })
          return
        }
        setProductState({
          key: requestKey,
          error: 'Could not load this product. Check your connection and try again.',
        })
      })

    return () => controller.abort()
  }, [productId, requestKey])

  if (!isValidId) {
    return (
      <section className="product-detail-state">
        <ErrorMessage message="This product link is invalid." />
        <Link className="button button--outline" to="/products">
          Back to products
        </Link>
      </section>
    )
  }

  const product =
    productState.key === requestKey ? productState.product : undefined
  const error =
    productState.key === requestKey ? productState.error : undefined

  if (error) {
    return (
      <section className="product-detail-state">
        <ErrorMessage message={error} />
        {error !== 'This product could not be found.' && (
          <button
            className="button button--outline"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </button>
        )}
        <Link className="text-link" to="/products">Back to products</Link>
      </section>
    )
  }

  if (!product) {
    return <Loading />
  }

  const galleryImages = [...new Set([product.imageCover, ...product.images])]
  const mainImage =
    selectedImage && galleryImages.includes(selectedImage)
      ? selectedImage
      : product.imageCover

  return (
    <section className="product-details" aria-labelledby="product-title">
      <Link className="text-link product-details__back" to="/products">
        ← Back to products
      </Link>
      <div className="product-details__layout">
        <div className="product-gallery">
          <div className="product-gallery__main">
            <img src={mainImage} alt={product.title} />
          </div>
          {galleryImages.length > 1 && (
            <div className="product-gallery__thumbnails" aria-label="Product images">
              {galleryImages.map((image, index) => (
                <button
                  className={
                    image === mainImage
                      ? 'product-gallery__thumbnail is-selected'
                      : 'product-gallery__thumbnail'
                  }
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  aria-label={`Show product image ${index + 1}`}
                  aria-pressed={image === mainImage}
                >
                  <img src={image} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-details__info">
          <p className="eyebrow">{product.category.name}</p>
          <h1 id="product-title">{product.title}</h1>
          <p className="product-details__rating">
            <span aria-hidden="true">★</span> {product.ratingsAverage} / 5
            <span>({product.ratingsQuantity} ratings)</span>
          </p>
          <p className="product-details__price">
            {priceFormatter.format(product.price)} <span>EGP</span>
          </p>
          <AddToCartButton productId={product._id} placement="details" />
          <WishlistButton productId={product._id} placement="details" />
          <p className="product-details__description">{product.description}</p>
          <dl className="product-specifications">
            <div>
              <dt>Availability</dt>
              <dd>
                {product.quantity > 0
                  ? `${product.quantity} available`
                  : 'Out of stock'}
              </dd>
            </div>
            <div>
              <dt>Brand</dt>
              <dd>{product.brand.name}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{product.category.name}</dd>
            </div>
            {product.subcategory.length > 0 && (
              <div>
                <dt>Subcategories</dt>
                <dd>
                  {product.subcategory.map((subcategory) => subcategory.name).join(', ')}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </section>
  )
}

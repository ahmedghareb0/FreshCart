import { Link } from 'react-router-dom'
import { AddToCartButton } from '../cart/AddToCartButton'
import { WishlistButton } from '../wishlist/WishlistButton'
import type { Product } from '../../types/entities'

type ProductCardProps = {
  product: Product
}

const priceFormatter = new Intl.NumberFormat('en-EG', {
  maximumFractionDigits: 2,
})

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      <WishlistButton productId={product._id} />
      <Link
        className="product-card__image-link"
        to={`/products/${encodeURIComponent(product._id)}`}
        aria-label={`View ${product.title}`}
      >
        <img
          className="product-card__image"
          src={product.imageCover}
          alt={product.title}
          loading="lazy"
        />
      </Link>
      <div className="product-card__content">
        <p className="product-card__category">{product.category.name}</p>
        <h2 className="product-card__title">
          <Link to={`/products/${encodeURIComponent(product._id)}`}>
            {product.title}
          </Link>
        </h2>
        <div className="product-card__footer">
          <p className="product-card__price">
            {priceFormatter.format(product.price)} <span>EGP</span>
          </p>
          <p
            className="product-card__rating"
            aria-label={`${product.ratingsAverage} out of 5 from ${product.ratingsQuantity} ratings`}
          >
            <span aria-hidden="true">★</span> {product.ratingsAverage}
            <span className="product-card__rating-count">
              ({product.ratingsQuantity})
            </span>
          </p>
        </div>
        <AddToCartButton productId={product._id} />
      </div>
    </article>
  )
}

import { Link } from 'react-router-dom'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { Loading } from '../components/common/Loading'
import { ProductCard } from '../components/products/ProductCard'
import { useWishlist } from '../context/useWishlist'

export function WishlistPage() {
  const wishlist = useWishlist()

  return (
    <section className="wishlist-page" aria-labelledby="wishlist-title">
      <header className="wishlist-page__heading">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h1 id="wishlist-title">Your wishlist</h1>
          <p className="products-page__intro">
            Keep the products you love together in one place.
          </p>
        </div>
        <Link className="button button--outline" to="/products">
          Continue shopping
        </Link>
      </header>

      {wishlist.error ? (
        <div className="wishlist-page__state">
          <ErrorMessage message={wishlist.error} />
          <button
            className="button button--outline"
            type="button"
            disabled={wishlist.loading}
            onClick={() => void wishlist.refresh().catch(() => undefined)}
          >
            {wishlist.loading ? 'Loading…' : 'Try again'}
          </button>
        </div>
      ) : wishlist.loading ? (
        <Loading />
      ) : wishlist.products.length === 0 ? (
        <div className="wishlist-empty">
          <span className="wishlist-empty__icon" aria-hidden="true">♡</span>
          <h2>Your wishlist is empty</h2>
          <p>Save products as you browse and they’ll show up here.</p>
          <Link className="button button--solid" to="/products">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {wishlist.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}

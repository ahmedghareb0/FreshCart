import { Link } from 'react-router-dom'
import type { Brand } from '../../types/entities'

type BrandCardProps = {
  brand: Brand
}

export function BrandCard({ brand }: BrandCardProps) {
  return (
    <article className="entity-card">
      <Link
        className="entity-card__image-link"
        to={`/brands/${encodeURIComponent(brand._id)}`}
        aria-label={`View ${brand.name} brand`}
      >
        <img
          className="entity-card__image"
          src={brand.image}
          alt={brand.name}
          loading="lazy"
        />
      </Link>
      <h2 className="entity-card__title">
        <Link to={`/brands/${encodeURIComponent(brand._id)}`}>
          {brand.name}
        </Link>
      </h2>
    </article>
  )
}

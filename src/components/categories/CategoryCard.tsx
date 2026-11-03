import { Link } from 'react-router-dom'
import type { Category } from '../../types/entities'

type CategoryCardProps = {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="entity-card">
      <Link
        className="entity-card__image-link"
        to={`/categories/${encodeURIComponent(category._id)}`}
        aria-label={`View ${category.name} category`}
      >
        <img
          className="entity-card__image"
          src={category.image}
          alt={category.name}
          loading="lazy"
        />
      </Link>
      <h2 className="entity-card__title">
        <Link to={`/categories/${encodeURIComponent(category._id)}`}>
          {category.name}
        </Link>
      </h2>
    </article>
  )
}

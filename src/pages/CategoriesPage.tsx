import { CategoryCard } from '../components/categories/CategoryCard'
import { EntityCollectionPage } from '../components/common/EntityCollectionPage'
import { getCategories } from '../services/categories.service'
import type { Category } from '../types/entities'

export function CategoriesPage() {
  return (
    <EntityCollectionPage<Category>
      title="Shop by Category"
      description="Explore the collections that make everyday shopping simple."
      resourceName="categories"
      fetchPage={getCategories}
      getKey={(category) => category._id}
      renderCard={(category) => <CategoryCard category={category} />}
    />
  )
}

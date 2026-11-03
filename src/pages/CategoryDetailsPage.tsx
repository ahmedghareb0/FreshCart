import { useParams } from 'react-router-dom'
import { EntityDetailsPage } from '../components/common/EntityDetailsPage'
import { getCategory } from '../services/categories.service'
import type { Category } from '../types/entities'

export function CategoryDetailsPage() {
  const { categoryId } = useParams()
  return (
    <EntityDetailsPage<Category>
      id={categoryId}
      kind="category"
      fetchEntity={getCategory}
    />
  )
}

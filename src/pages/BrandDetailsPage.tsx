import { useParams } from 'react-router-dom'
import { EntityDetailsPage } from '../components/common/EntityDetailsPage'
import { getBrand } from '../services/brands.service'
import type { Brand } from '../types/entities'

export function BrandDetailsPage() {
  const { brandId } = useParams()
  return (
    <EntityDetailsPage<Brand>
      id={brandId}
      kind="brand"
      fetchEntity={getBrand}
    />
  )
}

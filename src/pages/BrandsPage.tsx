import { BrandCard } from '../components/brands/BrandCard'
import { EntityCollectionPage } from '../components/common/EntityCollectionPage'
import { getBrands } from '../services/brands.service'
import type { Brand } from '../types/entities'

export function BrandsPage() {
  return (
    <EntityCollectionPage<Brand>
      title="Our Brands"
      description="Discover brands available across the FreshCart collection."
      resourceName="brands"
      fetchPage={getBrands}
      getKey={(brand) => brand._id}
      renderCard={(brand) => <BrandCard brand={brand} />}
    />
  )
}

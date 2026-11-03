export type Category = {
  _id: string
  name: string
  slug: string
  image: string
  createdAt: string
  updatedAt: string
}

export type Brand = {
  _id: string
  name: string
  slug: string
  image: string
  createdAt: string
  updatedAt: string
}

export type Product = {
  _id: string
  title: string
  slug: string
  description: string
  quantity: number
  price: number
  imageCover: string
  images: string[]
  sold: number
  ratingsAverage: number
  ratingsQuantity: number
  category: Pick<Category, '_id' | 'name' | 'slug' | 'image'>
  brand: Pick<Brand, '_id' | 'name' | 'slug' | 'image'>
  subcategory: {
    _id: string
    name: string
    slug: string
    category: string
  }[]
  createdAt: string
  updatedAt: string
  id: string
}

export type Review = {
  _id: string
  review: string
  rating: number
  product: string
  user: {
    _id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

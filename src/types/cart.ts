export type CartCategory = {
  name: string
  [key: string]: unknown
}

export type CartSubcategory = {
  _id: string
  name: string
  slug: string
  category: string
}

export type CartProduct = {
  _id: string
  id: string
  title: string
  slug: string
  quantity: number
  imageCover: string
  category: CartCategory
  brand: Record<string, unknown>
  ratingsAverage: number
  subcategory: CartSubcategory[]
}

export type CartItem = {
  _id: string
  product: CartProduct
  count: number
  price: number
  subtotal: number
}

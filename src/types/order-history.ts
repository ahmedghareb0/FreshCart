export type OrderProductSummary = {
  id: string | null
  title: string | null
  image: string | null
  count: number | null
  price: number | null
}

export type OrderHistoryItem = {
  id: string
  createdAt: string | null
  status: string | null
  isPaid: boolean | null
  paymentMethod: string | null
  total: number | null
  products: OrderProductSummary[]
}

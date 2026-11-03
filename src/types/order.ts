export type CashOrderVersion = 'v1' | 'v2'

export type ShippingAddress = {
  details: string
  phone: string
  city: string
  postalCode?: string
}

export type CashOrderRequest = {
  shippingAddress: ShippingAddress
}

export type CashV1OrderRequest = {
  shippingAddress: Pick<ShippingAddress, 'details' | 'phone' | 'city'>
}

export type CashV2OrderRequest = {
  shippingAddress: Required<ShippingAddress>
}

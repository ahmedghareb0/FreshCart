export type Address = {
  _id: string
  name: string
  details: string
  phone: string
  city: string
  postalCode?: string
}

export type AddressInput = Pick<Address, 'name' | 'details' | 'phone' | 'city'>

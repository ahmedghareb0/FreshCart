import type { CartCategory, CartItem, CartProduct, CartSubcategory } from '../types/cart'

export type CartSnapshot = {
  items: CartItem[]
  cartId: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseCategory(value: unknown): CartCategory | null {
  if (!isRecord(value) || !isNonEmptyString(value.name)) {
    return null
  }
  return { ...value, name: value.name }
}

function parseSubcategory(value: unknown): CartSubcategory | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value._id) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.slug) ||
    !isNonEmptyString(value.category)
  ) {
    return null
  }
  return {
    _id: value._id,
    name: value.name,
    slug: value.slug,
    category: value.category,
  }
}

function parseProduct(value: unknown): CartProduct | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value._id) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.slug) ||
    !isFiniteNonNegativeNumber(value.quantity) ||
    !isNonEmptyString(value.imageCover) ||
    !isFiniteNonNegativeNumber(value.ratingsAverage) ||
    !isRecord(value.brand) ||
    !Array.isArray(value.subcategory)
  ) {
    return null
  }

  const category = parseCategory(value.category)
  if (!category) {
    return null
  }

  const subcategory: CartSubcategory[] = []
  for (const entry of value.subcategory) {
    const parsedSubcategory = parseSubcategory(entry)
    if (!parsedSubcategory) {
      return null
    }
    subcategory.push(parsedSubcategory)
  }

  return {
    _id: value._id,
    id: value.id,
    title: value.title,
    slug: value.slug,
    quantity: value.quantity,
    imageCover: value.imageCover,
    category,
    brand: value.brand,
    ratingsAverage: value.ratingsAverage,
    subcategory,
  }
}

function getCartLines(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response
  }
  if (!isRecord(response)) {
    throw new Error('The cart response had an unsupported structure.')
  }
  if (Array.isArray(response.products)) {
    return response.products
  }
  if (Array.isArray(response.data)) {
    return response.data
  }
  if (isRecord(response.data) && Array.isArray(response.data.products)) {
    return response.data.products
  }
  throw new Error('The cart response had an unsupported structure.')
}

export function parseCartResponse(response: unknown): CartSnapshot {
  const lines = getCartLines(response)
  const items = lines.map((line): CartItem => {
    if (
      !isRecord(line) ||
      !isNonEmptyString(line._id) ||
      !Number.isInteger(line.count) ||
      typeof line.count !== 'number' ||
      line.count < 1 ||
      !isFiniteNonNegativeNumber(line.price)
    ) {
      throw new Error('A cart item had an unsupported structure.')
    }

    const product = parseProduct(line.product)
    if (!product) {
      throw new Error('A cart item had an unsupported structure.')
    }

    const subtotal = line.price * line.count
    if (!Number.isFinite(subtotal)) {
      throw new Error('A cart item had an unsupported structure.')
    }

    return {
      _id: line._id,
      product,
      count: line.count,
      price: line.price,
      subtotal,
    }
  })

  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.product._id)) {
      throw new Error('The cart response contained duplicate product items.')
    }
    ids.add(item.product._id)
  }

  const cartRecord = isRecord(response) && isRecord(response.data)
    ? response.data
    : response
  return {
    items,
    cartId: isRecord(cartRecord) && isNonEmptyString(cartRecord._id)
      ? cartRecord._id
      : null,
  }
}

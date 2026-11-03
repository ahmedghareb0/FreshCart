import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCartResponse } from '../src/services/cart-response.ts'

const mockCartLine = (index) => ({
  _id: `cart-line-${index}`,
  count: index + 1,
  price: 12.5 + index,
  product: {
    _id: `product-${index}`,
    id: `product-${index}`,
    title: `Product ${index}`,
    slug: `product-${index}`,
    quantity: 20,
    imageCover: `https://images.example.test/product-${index}.jpg`,
    category: {
      _id: 'category-id',
      name: 'Category',
    },
    brand: {
      _id: 'brand-id',
      name: 'Brand',
    },
    ratingsAverage: 4.2,
    subcategory: [
      {
        _id: 'subcategory-id',
        name: 'Subcategory',
        slug: 'subcategory',
        category: 'category-id',
      },
    ],
  },
})

const mockCartResponse = () => ({
  data: {
    _id: 'cart-id',
    products: [0, 1, 2, 3].map(mockCartLine),
  },
})

test('parses four actual cart products and uses the cart-line price', () => {
  const cart = parseCartResponse(mockCartResponse())

  assert.equal(cart.items.length, 4)
  assert.equal(cart.cartId, 'cart-id')
  assert.deepEqual(
    cart.items.map(({ product, count, price, subtotal }) => ({
      id: product._id,
      image: product.imageCover,
      count,
      price,
      subtotal,
    })),
    [
      {
        id: 'product-0',
        image: 'https://images.example.test/product-0.jpg',
        count: 1,
        price: 12.5,
        subtotal: 12.5,
      },
      {
        id: 'product-1',
        image: 'https://images.example.test/product-1.jpg',
        count: 2,
        price: 13.5,
        subtotal: 27,
      },
      {
        id: 'product-2',
        image: 'https://images.example.test/product-2.jpg',
        count: 3,
        price: 14.5,
        subtotal: 43.5,
      },
      {
        id: 'product-3',
        image: 'https://images.example.test/product-3.jpg',
        count: 4,
        price: 15.5,
        subtotal: 62,
      },
    ],
  )
})

test('does not require Product API fields absent from cart products', () => {
  const parsed = parseCartResponse(mockCartResponse())
  const product = parsed.items[0].product

  assert.equal('description' in product, false)
  assert.equal('images' in product, false)
  assert.equal('sold' in product, false)
  assert.equal('ratingsQuantity' in product, false)
  assert.equal('createdAt' in product, false)
  assert.equal('updatedAt' in product, false)
  assert.equal('price' in product, false)
  assert.equal(product.category.name, 'Category')
  assert.deepEqual(product.subcategory[0], {
    _id: 'subcategory-id',
    name: 'Subcategory',
    slug: 'subcategory',
    category: 'category-id',
  })
})

test('rejects missing product ID, invalid count, and invalid cart-line price', () => {
  const missingProductId = mockCartResponse()
  delete missingProductId.data.products[0].product._id
  assert.throws(() => parseCartResponse(missingProductId), /unsupported structure/)

  for (const count of [0, -1, 1.5, '2', Number.NaN]) {
    const invalidCount = mockCartResponse()
    invalidCount.data.products[0].count = count
    assert.throws(() => parseCartResponse(invalidCount), /unsupported structure/)
  }

  for (const price of [-1, Number.NaN, Number.POSITIVE_INFINITY, '12']) {
    const invalidPrice = mockCartResponse()
    invalidPrice.data.products[0].price = price
    assert.throws(() => parseCartResponse(invalidPrice), /unsupported structure/)
  }
})

test('rejects incomplete category, brand, or subcategory structures', () => {
  const invalidCategory = mockCartResponse()
  invalidCategory.data.products[0].product.category = []
  assert.throws(() => parseCartResponse(invalidCategory), /unsupported structure/)

  const invalidBrand = mockCartResponse()
  invalidBrand.data.products[0].product.brand = null
  assert.throws(() => parseCartResponse(invalidBrand), /unsupported structure/)

  const invalidSubcategory = mockCartResponse()
  invalidSubcategory.data.products[0].product.subcategory[0].category = {}
  assert.throws(() => parseCartResponse(invalidSubcategory), /unsupported structure/)
})

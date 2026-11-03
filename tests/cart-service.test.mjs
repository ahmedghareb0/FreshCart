import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../src/services/cart.service.ts'
import { parseCartResponse } from '../src/services/cart-response.ts'

const MOCK_TOKEN = 'isolated-test-token'
const PRODUCT_ID = 'mock-product-id'

async function withMockFetch(responseBody, run) {
  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (input, init) => {
    const url = new URL(input)
    assert.equal(url.origin, 'https://ecommerce.routemisr.com')
    assert.equal(url.pathname.startsWith('/api/v2/cart'), true)
    requests.push({ url, init })
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    await run(requests)
  } finally {
    globalThis.fetch = originalFetch
  }
}

test('loads and parses Cart using a fetch mock only', async () => {
  const responseBody = {
    data: {
      _id: 'cart-id',
      products: [{
        _id: 'cart-line-id',
        count: 2,
        price: 15,
        product: {
          _id: PRODUCT_ID,
          id: PRODUCT_ID,
          title: 'Mock Product',
          slug: 'mock-product',
          quantity: 5,
          imageCover: 'https://images.example.test/mock.jpg',
          category: { name: 'Mock Category' },
          brand: {},
          ratingsAverage: 4,
          subcategory: [],
        },
      }],
    },
  }

  await withMockFetch(responseBody, async (requests) => {
    const response = await getCart(MOCK_TOKEN)
    const cart = parseCartResponse(response)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].init.method ?? 'GET', 'GET')
    assert.equal(requests[0].url.pathname, '/api/v2/cart')
    assert.equal(cart.items.length, 1)
    assert.equal(cart.items[0].product.title, 'Mock Product')
  })
})

test('adds a product through mocked POST with the expected request body', async () => {
  await withMockFetch({ message: 'mock success' }, async (requests) => {
    await addToCart(MOCK_TOKEN, PRODUCT_ID)
    assert.equal(requests[0].init.method, 'POST')
    assert.equal(requests[0].url.pathname, '/api/v2/cart')
    assert.deepEqual(JSON.parse(requests[0].init.body), { productId: PRODUCT_ID })
  })
})

test('updates quantity through mocked PUT with the expected request body', async () => {
  await withMockFetch({ message: 'mock success' }, async (requests) => {
    await updateCartItem(MOCK_TOKEN, PRODUCT_ID, 3)
    assert.equal(requests[0].init.method, 'PUT')
    assert.equal(requests[0].url.pathname, `/api/v2/cart/${PRODUCT_ID}`)
    assert.deepEqual(JSON.parse(requests[0].init.body), { count: 3 })
  })
})

test('removes a product through mocked DELETE', async () => {
  await withMockFetch({ message: 'mock success' }, async (requests) => {
    await removeCartItem(MOCK_TOKEN, PRODUCT_ID)
    assert.equal(requests[0].init.method, 'DELETE')
    assert.equal(requests[0].url.pathname, `/api/v2/cart/${PRODUCT_ID}`)
    assert.equal(requests[0].init.body, undefined)
  })
})

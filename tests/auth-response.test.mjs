import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getVerifiedAuthUser,
  parseAuthSession,
} from '../src/services/auth-response.ts'

const mockAuthResponse = () => ({
  message: 'success',
  user: {
    name: 'Test User',
    email: 'test@example.test',
    role: 'user',
  },
  token: 'mock-auth-token',
})

test('accepts Signup response without an ID and returns its token and profile', () => {
  const session = parseAuthSession(mockAuthResponse())

  assert.deepEqual(session, {
    kind: 'valid',
    token: 'mock-auth-token',
    user: {
      name: 'Test User',
      email: 'test@example.test',
      role: 'user',
    },
  })
  assert.equal(session.kind === 'valid' && '_id' in session.user, false)
})

test('accepts Signin response without an ID and returns its token and profile', () => {
  const session = parseAuthSession(mockAuthResponse())

  assert.equal(session.kind, 'valid')
  if (session.kind === 'valid') {
    assert.equal(session.token, 'mock-auth-token')
    assert.equal(session.user.name, 'Test User')
    assert.equal(session.user.email, 'test@example.test')
    assert.equal(session.user.role, 'user')
    assert.equal(session.user._id, undefined)
  }
})

test('restores a verified profile without requiring an ID', () => {
  const user = getVerifiedAuthUser({
    user: {
      name: 'Test User',
      email: 'test@example.test',
      role: 'user',
    },
  })

  assert.deepEqual(user, {
    name: 'Test User',
    email: 'test@example.test',
    role: 'user',
  })
})

test('restores a nested verified profile without requiring an ID', () => {
  assert.deepEqual(
    getVerifiedAuthUser({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.test',
          role: 'user',
        },
      },
    }),
    {
      name: 'Test User',
      email: 'test@example.test',
      role: 'user',
    },
  )
})

test('restores a verifier response containing a real ID without requiring Signup fields', () => {
  assert.deepEqual(
    getVerifiedAuthUser({ data: { user: { _id: 'real-user-id' } } }),
    { _id: 'real-user-id' },
  )
})

test('restores the actual decoded verifyToken response and maps its real ID', () => {
  const user = getVerifiedAuthUser({
    message: 'verified',
    decoded: {
      id: '6ae74715cfea3d001307a66f',
      name: 'Test User',
      role: 'user',
      iat: 1793545455,
      exp: 1801321455,
    },
  })

  assert.deepEqual(user, {
    _id: '6ae74715cfea3d001307a66f',
    name: 'Test User',
    role: 'user',
  })
  assert.equal(user?.email, undefined)
})

test('preserves a decoded email only when the verifier actually returns one', () => {
  assert.deepEqual(
    getVerifiedAuthUser({
      decoded: {
        id: 'real-user-id',
        name: 'Test User',
        email: 'test@example.test',
        role: 'user',
      },
    }),
    {
      _id: 'real-user-id',
      name: 'Test User',
      email: 'test@example.test',
      role: 'user',
    },
  )
})

test('rejects decoded verification data missing a real ID, name, or role', () => {
  assert.equal(
    getVerifiedAuthUser({
      decoded: { name: 'Test User', role: 'user' },
    }),
    null,
  )
  assert.equal(
    getVerifiedAuthUser({
      decoded: { id: 'real-user-id', role: 'user' },
    }),
    null,
  )
  assert.equal(
    getVerifiedAuthUser({
      decoded: { id: 'real-user-id', name: 'Test User' },
    }),
    null,
  )
  assert.equal(
    getVerifiedAuthUser({
      decoded: { id: '   ', name: 'Test User', role: 'user' },
    }),
    null,
  )
})

test('does not accept an invalid profile or invent an ID', () => {
  assert.deepEqual(
    parseAuthSession({
      token: 'mock-auth-token',
      user: { name: 'Test User', email: 'test@example.test' },
    }),
    { kind: 'invalid-user' },
  )
  assert.deepEqual(getVerifiedAuthUser({ user: { name: 'Test User' } }), null)
})

test('reports a missing token separately from a valid profile', () => {
  assert.deepEqual(
    parseAuthSession({
      user: {
        name: 'Test User',
        email: 'test@example.test',
        role: 'user',
      },
    }),
    { kind: 'missing-token' },
  )
})

import { apiRequest } from './api'
import type { Address, AddressInput } from '../types/address'

const ADDRESSES_API_BASE = '/api/v1/addresses'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseAddress(value: unknown): Address {
  if (
    !isRecord(value) ||
    typeof value._id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.details !== 'string' ||
    typeof value.phone !== 'string' ||
    typeof value.city !== 'string' ||
    (
      value.postalCode !== undefined &&
      value.postalCode !== null &&
      typeof value.postalCode !== 'string'
    )
  ) {
    throw new Error('The address response had an unsupported structure.')
  }

  return {
    _id: value._id,
    name: value.name,
    details: value.details,
    phone: value.phone,
    city: value.city,
    ...(typeof value.postalCode === 'string'
      ? { postalCode: value.postalCode }
      : {}),
  }
}

export async function getAddresses(
  token: string,
  signal?: AbortSignal,
): Promise<Address[]> {
  const response = await apiRequest<unknown>(ADDRESSES_API_BASE, { token, signal })
  const addresses = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response.data)
      ? response.data
      : null

  if (!addresses) {
    throw new Error('The address list response had an unsupported structure.')
  }
  return addresses.map(parseAddress)
}

export async function getAddress(
  token: string,
  addressId: string,
): Promise<Address> {
  const response = await apiRequest<unknown>(
    `${ADDRESSES_API_BASE}/${encodeURIComponent(addressId)}`,
    { token },
  )
  return parseAddress(
    isRecord(response) && 'data' in response ? response.data : response,
  )
}

export function addAddress(
  token: string,
  input: AddressInput,
): Promise<unknown> {
  return apiRequest<unknown>(ADDRESSES_API_BASE, {
    method: 'POST',
    token,
    body: input,
  })
}

export function deleteAddress(
  token: string,
  addressId: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `${ADDRESSES_API_BASE}/${encodeURIComponent(addressId)}`,
    { method: 'DELETE', token },
  )
}

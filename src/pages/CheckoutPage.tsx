import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/common/Loading'
import { useAuth } from '../context/useAuth'
import { useCart } from '../context/useCart'
import { addAddress, deleteAddress, getAddresses } from '../services/address.service'
import { ApiError } from '../services/api'
import { createCashOrder } from '../services/order.service'
import type { Address, AddressInput } from '../types/address'
import type { CashOrderVersion } from '../types/order'

const priceFormatter = new Intl.NumberFormat('en-EG', {
  maximumFractionDigits: 2,
})

const EMPTY_ADDRESS: AddressInput = {
  name: '',
  details: '',
  phone: '',
  city: '',
}

function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} EGP`
}

function requestError(error: unknown): string {
  if (error instanceof ApiError) {
    return `Request failed (HTTP ${error.status}).`
  }
  return error instanceof Error ? error.message : 'The request failed.'
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function addressInput(address: Address): AddressInput {
  return {
    name: address.name,
    details: address.details,
    phone: address.phone,
    city: address.city,
  }
}

export function CheckoutPage() {
  const { token, logout } = useAuth()
  const cart = useCart()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesToken, setAddressesToken] = useState<string | null>(null)
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState('')
  const [addressFormOpen, setAddressFormOpen] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressInput>(EMPTY_ADDRESS)
  const [addressPending, setAddressPending] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [addressActionError, setAddressActionError] = useState<string | null>(null)
  const [addressActionMessage, setAddressActionMessage] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [cashVersion, setCashVersion] = useState<CashOrderVersion>('v1')
  const [orderPostalCode, setOrderPostalCode] = useState('')
  const [orderPending, setOrderPending] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [cartRefreshWarning, setCartRefreshWarning] = useState<string | null>(null)
  const addressRequestIdRef = useRef(0)
  const addressControllerRef = useRef<AbortController | null>(null)
  const currentTokenRef = useRef(token)

  useEffect(() => {
    currentTokenRef.current = token
  }, [token])

  const refreshAddresses = useCallback(async () => {
    const requestToken = token
    if (currentTokenRef.current !== requestToken) {
      return
    }
    addressControllerRef.current?.abort()
    const requestId = ++addressRequestIdRef.current

    if (!requestToken) {
      addressControllerRef.current = null
      setAddressesToken(null)
      setAddressesLoading(false)
      setAddresses([])
      setSelectedAddressId('')
      setAddressesError(null)
      return
    }

    const controller = new AbortController()
    addressControllerRef.current = controller
    setAddressesToken(requestToken)
    setAddresses([])
    setSelectedAddressId('')
    setAddressesLoading(true)
    setAddressesError(null)
    try {
      const nextAddresses = await getAddresses(requestToken, controller.signal)
      if (
        controller.signal.aborted ||
        requestId !== addressRequestIdRef.current ||
        currentTokenRef.current !== requestToken
      ) {
        return
      }
      setAddresses(nextAddresses)
      setSelectedAddressId(nextAddresses[0]?._id ?? '')
      setOrderPostalCode(nextAddresses[0]?.postalCode ?? '')
      setAddressFormOpen(nextAddresses.length === 0)
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        isAbortError(error) ||
        requestId !== addressRequestIdRef.current ||
        currentTokenRef.current !== requestToken
      ) {
        return
      }
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setAddressesError(requestError(error))
      throw error
    } finally {
      if (requestId === addressRequestIdRef.current) {
        addressControllerRef.current = null
        setAddressesLoading(false)
      }
    }
  }, [logout, token])

  useEffect(() => {
    let active = true
    void Promise.resolve()
      .then(() => active ? refreshAddresses() : undefined)
      .catch(() => undefined)
    return () => {
      active = false
      addressRequestIdRef.current += 1
      addressControllerRef.current?.abort()
      addressControllerRef.current = null
    }
  }, [refreshAddresses])

  const selectedAddress = useMemo(
    () => addressesToken === token
      ? addresses.find((address) => address._id === selectedAddressId) ?? null
      : null,
    [addresses, addressesToken, selectedAddressId, token],
  )

  function updateAddressForm(field: keyof AddressInput, value: string) {
    setAddressForm((current) => ({ ...current, [field]: value }))
  }

  async function submitAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAddressActionError(null)
    setAddressActionMessage(null)
    if (!token) {
      setAddressActionError('Sign in before managing shipping addresses.')
      return
    }

    const input: AddressInput = {
      name: addressForm.name.trim(),
      details: addressForm.details.trim(),
      phone: addressForm.phone.trim(),
      city: addressForm.city.trim(),
    }
    if (!input.name || !input.details || !input.phone || !input.city) {
      setAddressActionError('Complete the required address fields.')
      return
    }

    setAddressPending(true)
    try {
      await addAddress(token, input)
      setAddressActionMessage('Address added.')
      setAddressForm(EMPTY_ADDRESS)
      setAddressFormOpen(false)
      try {
        await refreshAddresses()
      } catch {
        setAddressActionError('Address added, but the address list could not be refreshed.')
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setAddressActionError(requestError(error))
    } finally {
      setAddressPending(false)
    }
  }

  async function removeAddress(addressId: string) {
    if (!token) {
      setAddressActionError('Sign in before managing shipping addresses.')
      return
    }
    setAddressActionError(null)
    setAddressActionMessage(null)
    setPendingDeleteId(addressId)
    try {
      await deleteAddress(token, addressId)
      setAddressActionMessage('Address deleted.')
      try {
        await refreshAddresses()
      } catch {
        setAddressActionError('Address deleted, but the address list could not be refreshed.')
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setAddressActionError(requestError(error))
    } finally {
      setPendingDeleteId(null)
    }
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOrderError(null)
    setCartRefreshWarning(null)
    setOrderSuccess(false)

    if (paymentMethod === 'online') {
      setOrderError(
        'Online checkout is not available until the server payment-session response is verified.',
      )
      return
    }
    if (!token) {
      setOrderError('Sign in before placing an order.')
      return
    }
    if (!cart.cartId) {
      setOrderError('The cart ID is unavailable; the order was not submitted.')
      return
    }
    if (cart.items.length === 0) {
      setOrderError('Add at least one item to your cart before checkout.')
      return
    }
    if (!selectedAddress) {
      setOrderError('Choose or add a shipping address before checkout.')
      return
    }
    const postalCode = orderPostalCode.trim() || selectedAddress.postalCode?.trim()
    if (cashVersion === 'v2' && !postalCode) {
      setOrderError('Cash v2 requires a postal code.')
      return
    }

    setOrderPending(true)
    try {
      await createCashOrder(
        token,
        cart.cartId,
        {
          ...addressInput(selectedAddress),
          ...(postalCode ? { postalCode } : {}),
        },
        cashVersion,
      )
      setOrderSuccess(true)
      try {
        await cart.refresh()
      } catch {
        setCartRefreshWarning(
          'The server confirmed the order, but the cart could not be refreshed.',
        )
      }
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        logout()
      }
      setOrderError(requestError(error))
    } finally {
      setOrderPending(false)
    }
  }

  const visibleAddresses = addressesToken === token ? addresses : []
  const visibleAddressesError = addressesToken === token ? addressesError : null
  const visibleAddressesLoading = Boolean(token) &&
    (addressesToken !== token || addressesLoading)

  if (cart.loading || visibleAddressesLoading) {
    return <Loading />
  }

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <header className="checkout-page__heading">
        <div>
          <p className="eyebrow">Almost there</p>
          <h1 id="checkout-title">Checkout</h1>
          <p className="products-page__intro">Review your cart and delivery details.</p>
        </div>
        <Link className="button button--outline" to="/cart">Back to cart</Link>
      </header>

      {visibleAddressesError && (
        <div className="checkout-feedback checkout-feedback--error" role="alert">
          <p>{visibleAddressesError}</p>
          <button
            className="button button--outline"
            type="button"
            onClick={() => void refreshAddresses().catch(() => undefined)}
          >
            Try loading addresses again
          </button>
        </div>
      )}
      {cart.error && (
        <div className="checkout-feedback checkout-feedback--error" role="alert">
          <p>{cart.error}</p>
          <button
            className="button button--outline"
            type="button"
            onClick={() => void cart.refresh().catch(() => undefined)}
          >
            Try loading the cart again
          </button>
        </div>
      )}

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-panel" aria-labelledby="checkout-address-title">
            <div className="checkout-panel__heading">
              <h2 id="checkout-address-title">Shipping address</h2>
              <button
                className="button button--outline"
                type="button"
                onClick={() => {
                  setAddressFormOpen((open) => !open)
                  setAddressActionError(null)
                  setAddressActionMessage(null)
                }}
              >
                {addressFormOpen ? 'Cancel' : 'Add address'}
              </button>
            </div>

            {visibleAddresses.length === 0 && !visibleAddressesError ? (
              <p className="checkout-muted">Add an address to continue.</p>
            ) : (
              <div className="checkout-addresses">
                {visibleAddresses.map((address) => (
                  <article className="checkout-address" key={address._id}>
                    <label className="checkout-address__select">
                      <input
                        type="radio"
                        name="shipping-address"
                        value={address._id}
                        checked={selectedAddressId === address._id}
                        onChange={() => {
                          setSelectedAddressId(address._id)
                          setOrderPostalCode(address.postalCode ?? '')
                        }}
                      />
                      <span>
                        <strong>{address.name}</strong>
                        <span>{address.details}</span>
                        <span>{address.city} · {address.phone}</span>
                        {address.postalCode && <span>Postal code: {address.postalCode}</span>}
                      </span>
                    </label>
                    <button
                      className="checkout-address__delete"
                      type="button"
                      disabled={pendingDeleteId !== null}
                      onClick={() => void removeAddress(address._id)}
                    >
                      {pendingDeleteId === address._id ? 'Deleting…' : 'Delete'}
                    </button>
                  </article>
                ))}
              </div>
            )}

            {addressFormOpen && (
              <form className="checkout-address-form" onSubmit={(event) => void submitAddress(event)}>
                <label>
                  Address name
                  <input
                    value={addressForm.name}
                    onChange={(event) => updateAddressForm('name', event.target.value)}
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  Address details
                  <input
                    value={addressForm.details}
                    onChange={(event) => updateAddressForm('details', event.target.value)}
                    autoComplete="street-address"
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    value={addressForm.phone}
                    onChange={(event) => updateAddressForm('phone', event.target.value)}
                    autoComplete="tel"
                    required
                  />
                </label>
                <label>
                  City
                  <input
                    value={addressForm.city}
                    onChange={(event) => updateAddressForm('city', event.target.value)}
                    autoComplete="address-level2"
                    required
                  />
                </label>
                <button className="button button--solid" type="submit" disabled={addressPending}>
                  {addressPending ? 'Saving address…' : 'Save address'}
                </button>
              </form>
            )}
            {addressActionError && (
              <p className="checkout-feedback checkout-feedback--error" role="alert">
                {addressActionError}
              </p>
            )}
            {addressActionMessage && (
              <p className="checkout-feedback checkout-feedback--success" role="status">
                {addressActionMessage}
              </p>
            )}
          </section>

          <form className="checkout-panel checkout-order-form" onSubmit={(event) => void submitOrder(event)}>
            <h2>Payment method</h2>
            <label className="checkout-choice">
              <input
                type="radio"
                name="payment-method"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={() => setPaymentMethod('cash')}
              />
              <span>Cash on delivery</span>
            </label>
            <label className="checkout-choice">
              <input
                type="radio"
                name="payment-method"
                value="online"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
              />
              <span>Online payment</span>
            </label>
            {paymentMethod === 'online' ? (
              <p className="checkout-feedback checkout-feedback--notice" role="status">
                Online checkout is not ready: the Checkout Session response has not been
                verified, so no payment link will be trusted or opened.
              </p>
            ) : (
              <label className="checkout-field">
                Cash API version
                <select
                  value={cashVersion}
                  onChange={(event) =>
                    setCashVersion(event.currentTarget.value === 'v2' ? 'v2' : 'v1')
                  }
                >
                  <option value="v1">Cash v1 (details, phone, city)</option>
                  <option value="v2">Cash v2 (includes postal code)</option>
                </select>
              </label>
            )}
            {paymentMethod === 'cash' && cashVersion === 'v2' && (
              <label className="checkout-field">
                Postal code
                <input
                  value={orderPostalCode}
                  onChange={(event) => setOrderPostalCode(event.target.value)}
                  autoComplete="postal-code"
                  required
                />
              </label>
            )}
            {orderError && (
              <p className="checkout-feedback checkout-feedback--error" role="alert">
                {orderError}
              </p>
            )}
            {orderSuccess && (
              <p className="checkout-feedback checkout-feedback--success" role="status">
                The server confirmed the order.
              </p>
            )}
            {cartRefreshWarning && (
              <p className="checkout-feedback checkout-feedback--notice" role="status">
                {cartRefreshWarning}
              </p>
            )}
            <button
              className="button button--solid checkout-submit"
              type="submit"
              disabled={
                orderPending ||
                addressPending ||
                pendingDeleteId !== null ||
                cart.items.length === 0
              }
            >
              {orderPending
                ? 'Submitting order…'
                : paymentMethod === 'online'
                  ? 'Online payment unavailable'
                  : 'Place cash order'}
            </button>
          </form>
        </div>

        <aside className="checkout-panel checkout-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          {cart.items.length === 0 ? (
            <p className="checkout-muted">Your cart is empty.</p>
          ) : (
            <ul className="checkout-summary__items">
              {cart.items.map((item) => (
                <li key={item.product._id}>
                  <span>{item.product.title} × {item.count}</span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className="checkout-summary__total">
            <span>Current cart total</span>
            <strong>{cart.total === null ? 'Unavailable' : formatPrice(cart.total)}</strong>
          </div>
          <p className="checkout-muted">
            Final charges and any shipping or tax are determined by the server.
          </p>
        </aside>
      </div>
    </section>
  )
}

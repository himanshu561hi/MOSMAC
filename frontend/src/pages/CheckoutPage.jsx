import React, { useState, useEffect, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Plus,
  ArrowLeft,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { SeoHead } from '@/components/common/SeoHead';
import { formatCurrency, isValidPinCode, isValidIndianPhone } from '@/utils/formatters';
import { fetchCart, clearCart } from '@/store/slices/cartSlice';
import { addToast } from '@/store/slices/uiSlice';
import {
  fetchAddresses,
  saveAddress,
  fetchCheckoutQuote,
  checkCodEligibility,
  placeOrder,
  verifyPayment,
  recordPaymentFailure,
  setSelectedShippingAddress,
  setSelectedBillingAddress,
  setUseSameForBilling,
  setPaymentMethod,
  resetCheckout
} from '@/store/slices/checkoutSlice';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items: cartItems, itemCount, subtotal: cartSubtotal, appliedCoupon } = useSelector((state) => state.cart);
  const {
    quote,
    loadingQuote,
    quoteError,
    addresses,
    loadingAddresses,
    selectedShippingAddress,
    selectedBillingAddress,
    useSameForBilling,
    paymentMethod,
    codEligibility,
    isPlacingOrder,
    placeOrderError
  } = useSelector((state) => state.checkout);

  // Address creation form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] = useState({
    fullName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    street: '',
    landmark: '',
    city: '',
    state: 'Maharashtra',
    postalCode: '',
    addressType: 'home',
    isDefaultShipping: true,
    isDefaultBilling: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Initial loads
  useEffect(() => {
    dispatch(fetchCart());
    if (isAuthenticated) {
      dispatch(fetchAddresses());
    } else {
      setShowAddressForm(true);
    }
  }, [dispatch, isAuthenticated]);

  // When items or postal code changes, fetch authoritative checkout quote
  const activePostalCode = selectedShippingAddress?.postalCode || addressFormData.postalCode;
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      const formattedItems = cartItems.map((item) => ({
        productId: String(item.productId || item.product?._id || item.product?.id || item._id || item.id),
        sku: item.sku,
        quantity: Number(item.quantity) || 1
      }));
      dispatch(
        fetchCheckoutQuote({
          items: formattedItems,
          couponCode: appliedCoupon?.code,
          postalCode: isValidPinCode(activePostalCode) ? activePostalCode : undefined
        })
      );
    }
  }, [dispatch, cartItems, appliedCoupon?.code, activePostalCode]);

  // When quote and postal code are available, check COD eligibility
  useEffect(() => {
    if (isValidPinCode(activePostalCode) && quote?.grandTotal) {
      dispatch(
        checkCodEligibility({
          postalCode: activePostalCode,
          amount: quote.grandTotal
        })
      );
    }
  }, [dispatch, activePostalCode, quote?.grandTotal]);

  const validateAddressForm = () => {
    const errors = {};
    if (!addressFormData.fullName?.trim()) errors.fullName = 'Full name is required';
    if (!addressFormData.phone?.trim()) {
      errors.phone = 'Mobile number is required';
    } else if (!isValidIndianPhone(addressFormData.phone)) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!isAuthenticated && !addressFormData.email?.trim()) {
      errors.email = 'Email address is required for order updates';
    }
    if (!addressFormData.street?.trim()) errors.street = 'Flat, house no., building, street is required';
    if (!addressFormData.city?.trim()) errors.city = 'City/District is required';
    if (!addressFormData.state?.trim()) errors.state = 'State is required';
    if (!addressFormData.postalCode?.trim()) {
      errors.postalCode = '6-digit PIN code is required';
    } else if (!isValidPinCode(addressFormData.postalCode)) {
      errors.postalCode = 'Enter a valid 6-digit Indian PIN code';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveNewAddress = async (e) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    const payload = {
      ...addressFormData,
      addressLine1: addressFormData.street?.trim() || 'Address',
      addressLine2: addressFormData.landmark?.trim() || addressFormData.street?.trim() || 'Locality'
    };

    if (isAuthenticated) {
      try {
        const resultAction = await dispatch(saveAddress(payload));
        if (saveAddress.fulfilled.match(resultAction)) {
          setShowAddressForm(false);
          dispatch(setSelectedShippingAddress(resultAction.payload));
          if (useSameForBilling) {
            dispatch(setSelectedBillingAddress(resultAction.payload));
          }
        } else {
          setGeneralError(resultAction.payload || 'Failed to save address. Please verify your details.');
        }
      } catch (err) {
        setGeneralError('Failed to save address. Please try again.');
      }
    } else {
      // Guest customer: set as current shipping address in memory
      dispatch(setSelectedShippingAddress(payload));
      if (useSameForBilling) {
        dispatch(setSelectedBillingAddress(payload));
      }
      setShowAddressForm(false);
    }
  };

  // Helper to load Razorpay checkout script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setGeneralError('');

    // Ensure we have an active shipping address
    let shippingAddr = selectedShippingAddress;
    if (!shippingAddr) {
      if (showAddressForm) {
        if (!validateAddressForm()) return;
        shippingAddr = addressFormData;
      } else {
        setGeneralError('Please add or select a delivery address');
        return;
      }
    }

    const billingAddr = useSameForBilling ? shippingAddr : (selectedBillingAddress || shippingAddr);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Build customer object
    const fullName = (shippingAddr.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`).trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || user?.firstName || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || user?.lastName || '';
    const email = (shippingAddr.email || user?.email || addressFormData.email || 'customer@example.in').trim();
    let rawPhone = (shippingAddr.phone || user?.phone || addressFormData.phone || '').toString().replace(/\D/g, '');
    if (rawPhone.length === 12 && rawPhone.startsWith('91')) rawPhone = rawPhone.slice(2);
    if (rawPhone.length === 11 && rawPhone.startsWith('0')) rawPhone = rawPhone.slice(1);
    const phone = rawPhone.length === 10 ? rawPhone : (rawPhone.slice(-10) || '9876543210');

    const customer = {
      firstName,
      lastName,
      email,
      phone
    };

    // Build items array
    const formattedItems = cartItems.map((item) => ({
      productId: String(item.productId || item.product?._id || item.product?.id || item._id || item.id),
      sku: item.sku,
      quantity: Number(item.quantity) || 1
    }));

    // Normalize shipping and billing addresses
    const cleanShippingAddr = {
      ...shippingAddr,
      phone,
      addressLine1: shippingAddr.addressLine1 || shippingAddr.street || 'Address Line 1',
      addressLine2: shippingAddr.addressLine2 || shippingAddr.landmark || shippingAddr.street || 'Address Line 2'
    };
    const cleanBillingAddr = {
      ...billingAddr,
      phone,
      addressLine1: billingAddr.addressLine1 || billingAddr.street || cleanShippingAddr.addressLine1,
      addressLine2: billingAddr.addressLine2 || billingAddr.landmark || billingAddr.street || cleanShippingAddr.addressLine2
    };

    const orderData = {
      customer,
      items: formattedItems,
      shippingAddress: cleanShippingAddr,
      billingAddress: cleanBillingAddr,
      paymentMethod,
      couponCode: appliedCoupon?.code || '',
      idempotencyKey
    };

    try {
      const orderResult = await dispatch(placeOrder({ orderData, idempotencyKey })).unwrap();

      if (paymentMethod === 'cod') {
        // COD order is immediately confirmed
        navigate(`/order-confirmation/${orderResult.order.orderNumber}`, {
          state: { order: orderResult.order, isNewOrder: true }
        });
        return;
      }

      if (paymentMethod === 'razorpay') {
        // Need to initiate Razorpay checkout
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          setGeneralError('Failed to load secure Razorpay payment gateway. Please check your internet connection.');
          return;
        }

        const razorpayOptions = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_mock_sandbox_key',
          amount: orderResult.razorpayOrder.amount,
          currency: orderResult.razorpayOrder.currency || 'INR',
          name: 'Aurora Retail',
          description: `Order ${orderResult.order.orderNumber}`,
          order_id: orderResult.razorpayOrder.id,
          prefill: {
            name: shippingAddr.fullName,
            email: shippingAddr.email || user?.email || '',
            contact: shippingAddr.phone
          },
          theme: {
            color: '#059669' // emerald-600
          },
          handler: async (response) => {
            try {
              await dispatch(
                verifyPayment({
                  orderId: orderResult.order._id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                })
              ).unwrap();

              navigate(`/order-confirmation/${orderResult.order.orderNumber}`, {
                state: { order: orderResult.order, isNewOrder: true }
              });
            } catch (verErr) {
              navigate(
                `/payment-failure?orderNumber=${orderResult.order.orderNumber}&reason=${encodeURIComponent(
                  verErr || 'Payment verification failed'
                )}`
              );
            }
          },
          modal: {
            ondismiss: async () => {
              await dispatch(
                recordPaymentFailure({
                  orderId: orderResult.order._id,
                  razorpayOrderId: orderResult.razorpayOrder.id,
                  errorCode: 'USER_CANCELLED',
                  errorMessage: 'Payment cancelled by user'
                })
              );
              navigate(
                `/payment-failure?orderNumber=${orderResult.order.orderNumber}&reason=${encodeURIComponent(
                  'Payment was cancelled before completion'
                )}`
              );
            }
          }
        };

        const rzp = new window.Razorpay(razorpayOptions);
        rzp.on('payment.failed', async (response) => {
          await dispatch(
            recordPaymentFailure({
              orderId: orderResult.order._id,
              razorpayOrderId: orderResult.razorpayOrder.id,
              errorCode: response.error?.code,
              errorMessage: response.error?.description || 'Payment transaction failed'
            })
          );
          navigate(
            `/payment-failure?orderNumber=${orderResult.order.orderNumber}&reason=${encodeURIComponent(
              response.error?.description || 'Payment transaction failed'
            )}`
          );
        });
        rzp.open();
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'Failed to initiate order. Please try again.');
      setGeneralError(errorMsg);
      dispatch(addToast({ type: 'error', message: errorMsg }));
    }
  };

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Bag is Empty</h1>
        <p className="text-sm text-gray-500 mb-6">
          You don't have any items in your shopping bag to check out.
        </p>
        <Link to="/products">
          <Button variant="primary">Explore Products</Button>
        </Link>
      </div>
    );
  }

  const effectiveQuote = quote || {
    subtotal: cartSubtotal,
    discountAmount: 0,
    shippingFee: cartSubtotal >= 99900 ? 0 : 4900,
    taxBreakdown: { totalTax: Math.round(cartSubtotal * 0.18) },
    grandTotal: cartSubtotal + (cartSubtotal >= 99900 ? 0 : 4900)
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <SeoHead
        title="Secure Checkout | Aura"
        description="Complete your order securely with SSL encryption, Cash on Delivery, and pan-India shipping."
        canonicalUrl="/checkout"
        robots="noindex, nofollow"
      />

      {/* Checkout Header */}
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/cart" className="hover:text-emerald-600 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Cart
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Secure Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Checkout & Payment
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>256-Bit SSL Encrypted</span>
        </div>
      </div>

      {/* Deduplicated Checkout Error Banner */}
      {(generalError || placeOrderError) && (
        <Alert
          variant="error"
          className="mb-6"
          dismissible
          onClose={() => {
            setGeneralError('');
            dispatch(resetCheckout());
          }}
        >
          {generalError || placeOrderError}
        </Alert>
      )}

      {quote?.warnings && quote.warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {quote.warnings.map((warn, i) => {
            const message = typeof warn === 'object' && warn !== null
              ? (warn.message || warn.sku || 'Order quote updated')
              : String(warn);
            return (
              <Alert key={i} variant="warning">
                {message}
              </Alert>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery & Payment Options */}
        <div className="lg:col-span-8 space-y-8">
          {/* Step 1: Delivery Address */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                  1
                </span>
                <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
              </div>
              {isAuthenticated && !showAddressForm && (
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add New Address
                </button>
              )}
            </div>

            {/* Saved Addresses List (Authenticated) */}
            {isAuthenticated && !showAddressForm && (
              <div className="space-y-4">
                {loadingAddresses ? (
                  <div className="py-6 flex justify-center">
                    <LoadingSpinner size="md" />
                  </div>
                ) : addresses && addresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => {
                      const isSelected = selectedShippingAddress?._id === addr._id;
                      return (
                        <div
                          key={addr._id}
                          onClick={() => {
                            dispatch(setSelectedShippingAddress(addr));
                            if (useSameForBilling) {
                              dispatch(setSelectedBillingAddress(addr));
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 mb-2">
                              {addr.addressType || 'Home'}
                            </span>
                            {addr.isDefaultShipping && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-gray-900">{addr.fullName}</p>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {addr.street}
                            {addr.landmark ? `, ${addr.landmark}` : ''}
                            <br />
                            {addr.city}, {addr.state} -{' '}
                            <strong className="text-gray-900">{addr.postalCode}</strong>
                          </p>
                          <p className="text-xs text-gray-500 mt-2 font-medium">📞 +91 {addr.phone}</p>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute bottom-4 right-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-gray-300 rounded-2xl">
                    <p className="text-sm text-gray-500 mb-3">No saved addresses found.</p>
                    <Button size="sm" onClick={() => setShowAddressForm(true)}>
                      Add Your First Address
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Address Form (New Address or Guest) */}
            {showAddressForm && (
              <form onSubmit={handleSaveNewAddress} className="space-y-4 pt-2">
                {!isAuthenticated && (
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 mb-4 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Checking out as Guest.</span> Have an account?
                    </div>
                    <Link to="/login?redirect=/checkout" className="font-bold underline text-emerald-700">
                      Sign In
                    </Link>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    placeholder="Recipient's Name"
                    value={addressFormData.fullName}
                    onChange={(e) => setAddressFormData({ ...addressFormData, fullName: e.target.value })}
                    error={formErrors.fullName}
                  />

                  <Input
                    label="Mobile Phone Number *"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={addressFormData.phone}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        phone: e.target.value.replace(/\D/g, '')
                      })
                    }
                    error={formErrors.phone}
                    helperText="Used for delivery notifications and SMS alerts"
                  />
                </div>

                {!isAuthenticated && (
                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="you@example.com"
                    value={addressFormData.email}
                    onChange={(e) => setAddressFormData({ ...addressFormData, email: e.target.value })}
                    error={formErrors.email}
                    helperText="We will send the invoice and order confirmation here"
                  />
                )}

                <Input
                  label="Flat, House no., Building, Street, Locality *"
                  placeholder="e.g. 402, Sunshine Heights, M.G. Road"
                  value={addressFormData.street}
                  onChange={(e) => setAddressFormData({ ...addressFormData, street: e.target.value })}
                  error={formErrors.street}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Landmark (Optional)"
                    placeholder="e.g. Near City Mall"
                    value={addressFormData.landmark}
                    onChange={(e) => setAddressFormData({ ...addressFormData, landmark: e.target.value })}
                  />

                  <Input
                    label="PIN Code (6 digits) *"
                    placeholder="e.g. 400001"
                    maxLength={6}
                    value={addressFormData.postalCode}
                    onChange={(e) =>
                      setAddressFormData({
                        ...addressFormData,
                        postalCode: e.target.value.replace(/\D/g, '')
                      })
                    }
                    error={formErrors.postalCode}
                  />

                  <Input
                    label="City / District *"
                    placeholder="e.g. Mumbai"
                    value={addressFormData.city}
                    onChange={(e) => setAddressFormData({ ...addressFormData, city: e.target.value })}
                    error={formErrors.city}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">State *</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      value={addressFormData.state}
                      onChange={(e) => setAddressFormData({ ...addressFormData, state: e.target.value })}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address Type</label>
                    <div className="flex gap-4 pt-1.5">
                      {['home', 'work', 'other'].map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 capitalize">
                          <input
                            type="radio"
                            name="addressType"
                            checked={addressFormData.addressType === type}
                            onChange={() => setAddressFormData({ ...addressFormData, addressType: type })}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {isAuthenticated && addresses.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAddressForm(false)}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" variant="primary">
                    {isAuthenticated ? 'Save & Deliver Here' : 'Use This Delivery Address'}
                  </Button>
                </div>
              </form>
            )}

            {/* Billing Address Toggle */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={useSameForBilling}
                  onChange={(e) => dispatch(setUseSameForBilling(e.target.checked))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Billing address is same as delivery address</span>
              </label>
            </div>
          </div>

          {/* Step 2: Shipping Service & Lead Time */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                2
              </span>
              <h2 className="text-lg font-bold text-gray-900">Delivery Method & Timeline</h2>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/70 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900">Standard Express Surface Delivery</p>
                  <p className="text-sm font-bold text-emerald-700">
                    {effectiveQuote.shippingFee === 0 ? 'FREE' : formatCurrency(effectiveQuote.shippingFee)}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Estimated Delivery in <strong>3 – 5 business days</strong> across India with end-to-end tracking.
                </p>
                {effectiveQuote.shippingFee === 0 ? (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    🎉 Free Shipping applied (orders ₹999 and above)!
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Flat rate of ₹49 for orders below ₹999.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Payment Options */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 md:p-8 shadow-2xs">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center">
                3
              </span>
              <h2 className="text-lg font-bold text-gray-900">Select Payment Method</h2>
            </div>

            <div className="space-y-4">
              {/* Option 1: Razorpay Online */}
              <label
                className={`p-4 sm:p-5 rounded-2xl border-2 block cursor-pointer transition-all ${paymentMethod === 'razorpay'
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
              >
                <div className="flex items-start gap-3.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => dispatch(setPaymentMethod('razorpay'))}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">
                          Online Payment (UPI, Cards, NetBanking, Wallets)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Secured by Razorpay. Pay seamlessly with Google Pay, PhonePe, Paytm, any UPI app, Credit/Debit cards, or NetBanking.
                    </p>
                  </div>
                </div>
              </label>

              {/* Option 2: Cash on Delivery */}
              <label
                className={`p-4 sm:p-5 rounded-2xl border-2 block transition-all ${codEligibility.checking
                  ? 'opacity-60 cursor-wait'
                  : !codEligibility.eligible && codEligibility.eligible !== null
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                    : paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50/30 shadow-xs cursor-pointer'
                      : 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                  }`}
              >
                <div className="flex items-start gap-3.5">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    disabled={!codEligibility.eligible && codEligibility.eligible !== null}
                    checked={paymentMethod === 'cod'}
                    onChange={() => dispatch(setPaymentMethod('cod'))}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">Cash on Delivery (COD)</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        Pay on Delivery
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pay in cash or through UPI QR code presented by delivery agent at the time of delivery.
                    </p>

                    {codEligibility.checking && (
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <LoadingSpinner size="xs" /> Verifying COD availability for PIN...
                      </p>
                    )}

                    {!codEligibility.eligible && codEligibility.reason && (
                      <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {codEligibility.reason}
                      </p>
                    )}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Review */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-2xs space-y-5 sticky top-24">
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-normal text-gray-500">{itemCount} items</span>
            </h2>

            {/* Items Mini List */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-gray-100">
              {cartItems.map((item) => (
                <div key={item.sku} className="pt-3 first:pt-0 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl || item.product?.images?.[0]?.url || item.images?.[0]?.url ? (
                      <img
                        src={item.imageUrl || item.product?.images?.[0]?.url || item.images?.[0]?.url}
                        alt={item.title || item.product?.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium">No img</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {item.product?.title || item.title}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 shrink-0">
                    {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-4">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-gray-900">{formatCurrency(effectiveQuote.subtotal)}</span>
              </div>

              {effectiveQuote.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>- {formatCurrency(effectiveQuote.discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span>
                  {effectiveQuote.shippingFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatCurrency(effectiveQuote.shippingFee)
                  )}
                </span>
              </div>

              {effectiveQuote.taxBreakdown && (
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Estimated GST (Inclusive)</span>
                  <span>{formatCurrency(effectiveQuote.taxBreakdown.totalTax || 0)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs font-bold text-gray-900">Total Payable</p>
                <p className="text-[10px] text-gray-400">All Indian Taxes Included</p>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {formatCurrency(effectiveQuote.grandTotal)}
              </p>
            </div>

            {/* Place Order CTA */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={isPlacingOrder || loadingQuote}
              onClick={handlePlaceOrder}
              className="w-full flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
            >
              {isPlacingOrder ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Processing Order...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>
                    {paymentMethod === 'cod' ? 'Confirm Order (COD)' : `Pay ${formatCurrency(effectiveQuote.grandTotal)}`}
                  </span>
                </>
              )}
            </Button>

            <p className="text-[10px] text-center text-gray-400">
              By placing your order, you agree to Aurora Retail's Terms of Sale and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Search,
  Truck,
  Package,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { lookupGuestOrder, clearGuestLookup } from '@/store/slices/orderSlice';

const TIMELINE_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', desc: 'Order placed & verified' },
  { key: 'processing', label: 'Processing', desc: 'Packed at warehouse' },
  { key: 'shipped', label: 'In Transit', desc: 'Handed over to courier' },
  { key: 'delivered', label: 'Delivered', desc: 'Delivered to your address' }
];

export function GuestOrderLookupPage() {
  const dispatch = useDispatch();
  const { guestOrder, guestLoading, guestError } = useSelector((state) => state.orders);

  const [orderNumber, setOrderNumber] = useState('');
  const [contactType, setContactType] = useState('phone'); // 'phone' or 'email'
  const [contactValue, setContactValue] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleLookup = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!orderNumber.trim()) {
      setValidationError('Please enter your order reference number (e.g. ORD-20261114-12345)');
      return;
    }
    if (!contactValue.trim()) {
      setValidationError(
        `Please enter the ${contactType === 'phone' ? '10-digit mobile number' : 'email address'} used during checkout`
      );
      return;
    }

    dispatch(
      lookupGuestOrder({
        orderNumber: orderNumber.trim(),
        phone: contactType === 'phone' ? contactValue.trim() : undefined,
        email: contactType === 'email' ? contactValue.trim() : undefined
      })
    );
  };

  const handleReset = () => {
    dispatch(clearGuestLookup());
    setOrderNumber('');
    setContactValue('');
    setValidationError('');
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'confirmed':
        return 0;
      case 'processing':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  };

  const currentStep = guestOrder ? getStepIndex(guestOrder.orderStatus) : 0;
  const isCancelled = guestOrder?.orderStatus === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Truck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Track Your Order
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Enter your order reference number and verified contact details to view real-time delivery status and consignment tracking.
        </p>
      </div>

      {/* Lookup Card / Form */}
      {!guestOrder ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs max-w-xl mx-auto">
          {validationError && (
            <Alert variant="error" className="mb-4">
              {validationError}
            </Alert>
          )}

          {guestError && (
            <Alert variant="error" className="mb-4">
              {guestError}
            </Alert>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <Input
              label="Order Number *"
              placeholder="e.g. ORD-20261114-12345"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
              helperText="Found in your order confirmation email or SMS"
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Verification Detail *</label>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="contactType"
                      checked={contactType === 'phone'}
                      onChange={() => setContactType('phone')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Phone</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="contactType"
                      checked={contactType === 'email'}
                      onChange={() => setContactType('email')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <Input
                type={contactType === 'email' ? 'email' : 'tel'}
                placeholder={
                  contactType === 'phone'
                    ? '10-digit mobile number (e.g. 9876543210)'
                    : 'Email address used at checkout'
                }
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={guestLoading}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              {guestLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Looking up order...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Package</span>
                </>
              )}
            </Button>
          </form>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              ← Track Another Order
            </button>
            <span className="text-xs text-gray-400">
              Placed on {formatDate(guestOrder.createdAt)}
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-2xs space-y-8">
            {/* Header / Status Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                  Order Reference
                </p>
                <p className="text-xl sm:text-2xl font-black text-gray-900 font-mono">
                  {guestOrder.orderNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full ${
                    isCancelled
                      ? 'bg-rose-100 text-rose-700'
                      : guestOrder.orderStatus === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  Status: {guestOrder.orderStatus}
                </span>
              </div>
            </div>

            {/* Stepper */}
            {isCancelled ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold">This order was cancelled</p>
                  <p className="text-xs text-rose-600">
                    Reason: {guestOrder.cancellation?.reason || 'Cancelled'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {TIMELINE_STEPS.map((step, idx) => {
                  const isDone = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="text-center space-y-1.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-emerald-700' : isDone ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[10px] text-gray-400">{step.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tracking / Courier Box */}
            {guestOrder.tracking?.trackingNumber && (
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      Courier Partner: {guestOrder.tracking.carrier || 'Express Logistics'}
                    </p>
                    <p className="text-xs text-gray-600 font-mono">
                      Tracking / AWB Number: {guestOrder.tracking.trackingNumber}
                    </p>
                  </div>
                </div>
                {guestOrder.tracking.trackingUrl && (
                  <a
                    href={guestOrder.tracking.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>View Courier Tracking</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Items */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Items ({guestOrder.items?.length || 0})</span>
              </h3>
              <div className="divide-y divide-gray-100">
                {guestOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{item.title}</p>
                        <p className="text-[11px] text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-gray-900">
                      {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Destination */}
            {guestOrder.shippingAddress && (
              <div className="border-t border-gray-100 pt-6 text-xs text-gray-600">
                <h3 className="font-bold uppercase tracking-wider text-gray-900 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Delivering to</span>
                </h3>
                <p className="font-bold text-gray-900">{guestOrder.shippingAddress.fullName}</p>
                <p>
                  {guestOrder.shippingAddress.street}, {guestOrder.shippingAddress.city},{' '}
                  {guestOrder.shippingAddress.state} - {guestOrder.shippingAddress.postalCode}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestOrderLookupPage;

import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  HelpCircle,
  CreditCard,
  ShieldAlert
} from 'lucide-react';
import Button from '@/components/common/Button';

export function PaymentFailurePage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('orderNumber');
  const failureReason = searchParams.get('reason') || 'Transaction could not be completed';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 md:py-20 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50">
        <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
        Payment Incomplete
      </span>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-3">
        Payment Could Not Be Completed
      </h1>

      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
        Your payment attempt was not processed. Your inventory reservation has been safely handled.
      </p>

      {/* Failure Details Card */}
      <div className="my-8 bg-white rounded-3xl border border-gray-200/80 p-6 text-left shadow-2xs space-y-4">
        {orderNumber && (
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Order Reference</span>
            <span className="text-xs font-mono font-bold text-gray-800">{orderNumber}</span>
          </div>
        )}

        <div>
          <span className="text-xs font-semibold text-gray-500 block mb-1">Reason for Failure</span>
          <p className="text-sm font-bold text-rose-700 bg-rose-50/70 p-3 rounded-xl border border-rose-100">
            {failureReason}
          </p>
        </div>

        <div className="pt-2 text-xs text-gray-600 space-y-2">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Financial Safeguard:</span>
          </p>
          <p className="text-gray-500 text-[11px] leading-relaxed">
            If any funds were debited by your bank, the Indian banking network will automatically reverse the full amount to your original payment method within 3 to 5 business days.
          </p>
        </div>
      </div>

      {/* Common Guidance */}
      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60 text-left text-xs text-gray-600 mb-8 space-y-1.5">
        <p className="font-bold text-gray-800">What can you do?</p>
        <ul className="list-disc list-inside space-y-1 text-gray-500 text-[11px]">
          <li>Check that your card has online transactions enabled in your banking app.</li>
          <li>Retry using UPI (Google Pay, PhonePe, Paytm) for quick instant verification.</li>
          <li>Choose Cash on Delivery (COD) if you prefer to pay when the package arrives.</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/checkout" className="w-full sm:w-auto">
          <Button variant="primary" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>Retry Checkout</span>
          </Button>
        </Link>
        <Link to="/cart" className="w-full sm:w-auto">
          <Button variant="ghost" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Bag</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default PaymentFailurePage;

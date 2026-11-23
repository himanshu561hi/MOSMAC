import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, MapPin, Truck, CheckCircle2, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { setDeliveryPincode, setPincodeModalOpen } from '@/store/slices/uiSlice';
import { storefrontService } from '@/services/storefrontService';
import Button from '@/components/common/Button';

const POPULAR_METROS = [
  { city: 'New Delhi', pin: '110001' },
  { city: 'Mumbai', pin: '400001' },
  { city: 'Bengaluru', pin: '560001' },
  { city: 'Kolkata', pin: '700001' },
  { city: 'Hyderabad', pin: '500001' },
  { city: 'Chennai', pin: '600001' }
];

export function DeliveryPincodeModal() {
  const dispatch = useDispatch();
  const { deliveryPincode, deliveryRegion, pincodeModalOpen } = useSelector((state) => state.ui);

  const [inputPin, setInputPin] = useState(deliveryPincode || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (pincodeModalOpen) {
      setInputPin(deliveryPincode || '');
      setError('');
      setResult(null);
    }
  }, [pincodeModalOpen, deliveryPincode]);

  if (!pincodeModalOpen) return null;

  const handleVerifyPincode = async (targetPin) => {
    const pin = (targetPin || inputPin).trim();
    setError('');
    setResult(null);

    // Validate 6-digit Indian PIN code format
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setError('Please enter a valid 6-digit Indian PIN code (e.g. 110001, 400001, 560001)');
      return;
    }

    setLoading(true);
    try {
      const data = await storefrontService.checkPinCode(pin);
      setResult(data);
      // Auto-apply after verified
      dispatch(
        setDeliveryPincode({
          pincode: pin,
          region: data?.region || 'National Hub'
        })
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not verify delivery serviceability for this PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMetro = (pin) => {
    setInputPin(pin);
    handleVerifyPincode(pin);
  };

  const handleClose = () => {
    dispatch(setPincodeModalOpen(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Select Delivery Location</h3>
              <p className="text-xs text-slate-500">Check delivery speed & serviceability</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current Saved PIN */}
          {deliveryPincode && (
            <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-slate-500">Currently delivering to: </span>
                  <span className="font-bold text-slate-900">{deliveryPincode}</span>
                  {deliveryRegion && <span className="text-emerald-700 block text-[11px] font-medium">{deliveryRegion}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerifyPincode();
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Enter 6-Digit Indian Postal PIN Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={inputPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setInputPin(val);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 110001"
                  className="w-full px-4 py-2.5 text-sm font-semibold tracking-wider text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:outline-none transition-all placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={loading || inputPin.length !== 6}
                className="px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs text-xs font-bold"
              >
                {loading ? 'Checking...' : 'Check'}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && result.isServiceable && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PIN {result.pincode} is fully serviceable!</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Est: {result.estimatedDelivery || '2-4 Days'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Free Shipping &gt; ₹999</span>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Popular Metro Quick Select */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Quick Select Major Cities
            </span>
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_METROS.map((metro) => (
                <button
                  key={metro.pin}
                  type="button"
                  onClick={() => handleSelectMetro(metro.pin)}
                  className={`p-2 rounded-xl text-xs text-left border transition-all ${
                    deliveryPincode === metro.pin
                      ? 'border-emerald-500 bg-emerald-50/60 font-bold text-emerald-900 shadow-2xs'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="block truncate font-medium">{metro.city}</span>
                  <span className="text-[10px] text-slate-400 block font-mono">{metro.pin}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">Serving 25,000+ Indian PIN Codes</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryPincodeModal;

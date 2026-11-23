import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setAuthModalOpen, clearPendingAction, addToast } from '@/store/slices/uiSlice';
import { setCredentials } from '@/store/slices/authSlice';
import { addToCart, fetchCart, mergeGuestCart } from '@/store/slices/cartSlice';
import { addToWishlist, fetchWishlist } from '@/store/slices/wishlistSlice';
import authService from '@/features/auth/authService';
import { getGuestId } from '@/services/apiClient';
import {
  X,
  Lock,
  Mail,
  User,
  ShoppingBag,
  Heart,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export function AuthModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { authModalOpen, pendingAction } = useSelector((state) => state.ui);

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  const handleClose = () => {
    dispatch(setAuthModalOpen(false));
    dispatch(clearPendingAction());
    setError('');
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const guestId = getGuestId();
      let authResponse;
      if (mode === 'login') {
        authResponse = await authService.login({
          email: formData.email.trim(),
          password: formData.password,
          guestId
        });
      } else {
        authResponse = await authService.register({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          guestId
        });
      }

      const user = authResponse.user || authResponse;
      const accessToken = authResponse.accessToken;

      if (user) {
        dispatch(setCredentials({ user, accessToken }));

        // 1. Merge guest cart items into authenticated user cart
        if (guestId) {
          try {
            await dispatch(mergeGuestCart(guestId)).unwrap();
          } catch (mergeErr) {
            console.warn('Guest cart merge notice:', mergeErr);
          }
        }
        await dispatch(fetchCart()).unwrap();
        dispatch(fetchWishlist());

        // 2. Execute pending action after login!
        if (pendingAction) {
          if (pendingAction.type === 'checkout' || pendingAction.redirectTo === '/checkout') {
            handleClose();
            dispatch(
              addToast({
                type: 'success',
                message: mode === 'login' ? 'Signed in! Proceeding to checkout...' : 'Account created! Proceeding to checkout...'
              })
            );
            navigate(pendingAction.redirectTo || '/checkout');
            return;
          }
          if (pendingAction.type === 'buyNow' && pendingAction.payload) {
            handleClose();
            navigate('/checkout', { state: { buyNowItem: pendingAction.payload } });
            return;
          }
          if (pendingAction.type === 'cart' && pendingAction.payload) {
            try {
              await dispatch(addToCart(pendingAction.payload)).unwrap();
              dispatch(fetchCart());
              dispatch(
                addToast({
                  type: 'success',
                  message: 'Item added to your shopping bag!'
                })
              );
            } catch (cartErr) {
              console.error('Failed to execute pending cart addition:', cartErr);
            }
          } else if (pendingAction.type === 'wishlist' && pendingAction.payload) {
            try {
              await dispatch(addToWishlist(pendingAction.payload)).unwrap();
              dispatch(fetchWishlist());
              dispatch(
                addToast({
                  type: 'success',
                  message: 'Item saved to your wishlist!'
                })
              );
            } catch (wishErr) {
              console.error('Failed to execute pending wishlist addition:', wishErr);
            }
          }
        } else {
          dispatch(
            addToast({
              type: 'success',
              message: mode === 'login' ? 'Signed in successfully!' : 'Account created successfully!'
            })
          );
        }

        handleClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
              {pendingAction?.type === 'wishlist'
                ? 'Save to Wishlist'
                : 'Shopping Bag Required'}
            </span>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            {pendingAction?.type === 'wishlist' ? (
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
            )}
            {mode === 'login' ? 'Sign In to Continue' : 'Create Customer Account'}
          </h3>

          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {pendingAction
              ? 'Please log in or create an account. Your selected item will be saved automatically once you sign in!'
              : 'Sign in to access your bag, manage delivery addresses, and track your orders.'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Aditi"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Sharma"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gray-950 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In & Save Item' : 'Create Account & Save Item'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-bit SSL encrypted • Instant session restore</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;

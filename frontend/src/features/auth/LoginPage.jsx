import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { fetchCart, mergeGuestCart } from '@/store/slices/cartSlice';
import { fetchWishlist, mergeGuestWishlist } from '@/store/slices/wishlistSlice';
import { getGuestId, clearGuestId } from '@/services/apiClient';
import { authService } from './authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const redirectUrl = queryParams.get('redirect') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const guestId = getGuestId();
      const data = await authService.login({ ...values, guestId });
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));

      // Merge guest cart & wishlist if guestId was active
      if (guestId) {
        try {
          await dispatch(mergeGuestCart(guestId)).unwrap();
          await dispatch(mergeGuestWishlist(guestId)).unwrap();
        } catch (mergeErr) {
          console.warn('Guest cart merge notice:', mergeErr);
        }
      }
      await dispatch(fetchCart()).unwrap();
      dispatch(fetchWishlist());

      if (redirectUrl === '/' && data.user.role !== 'customer') {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectUrl, { replace: true });
      }
    } catch (err) {
      setServerError(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to your account</h2>
          <p className="mt-2 text-xs text-gray-500">
            Welcome back! Access your orders, wishlist, and profile.
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <Link
              to="/forgot-password"
              className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isSubmitting}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-5">
          Don't have an account yet?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className="font-semibold text-emerald-600 hover:text-emerald-700">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;


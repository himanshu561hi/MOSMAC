import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { fetchCart, mergeGuestCart } from '@/store/slices/cartSlice';
import { fetchWishlist, mergeGuestWishlist } from '@/store/slices/wishlistSlice';
import { clearGuestId } from '@/services/apiClient';
import { authService } from './authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50),
    lastName: z.string().max(50).optional().default(''),
    email: z.string().email('Please enter a valid email address').toLowerCase(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number').optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128)
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[0-9]/, 'At least one number')
      .regex(/[^A-Za-z0-9]/, 'At least one special character'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export function RegisterPage() {
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
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const passwordValue = watch('password', '');

  const passwordChecks = [
    { label: '8+ characters', pass: passwordValue.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(passwordValue) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(passwordValue) },
    { label: 'Number', pass: /[0-9]/.test(passwordValue) },
    { label: 'Special symbol', pass: /[^A-Za-z0-9]/.test(passwordValue) }
  ];

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        ...(values.phone ? { phone: values.phone } : {})
      };

      const data = await authService.register(payload);
      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));

      // Merge guest cart & wishlist if guestId was active
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('aurora_guest_id') : null;
      if (guestId) {
        dispatch(mergeGuestCart(guestId));
        dispatch(mergeGuestWishlist(guestId));
        clearGuestId();
      } else {
        dispatch(fetchCart());
        dispatch(fetchWishlist());
      }

      navigate(redirectUrl, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your information.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
          <p className="mt-2 text-xs text-gray-500">
            Join thousands of shoppers for genuine quality products and fast delivery.
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              placeholder="Aarav"
              required
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last name"
              placeholder="Sharma"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Mobile number (Optional)"
            type="tel"
            placeholder="9876543210"
            helperText="10-digit Indian number for order delivery updates"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
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

          {/* Password Security Meter */}
          {passwordValue && (
            <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-1.5">
              <span className="text-[11px] font-semibold text-gray-600 block">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {passwordChecks.map((req, idx) => (
                  <span
                    key={idx}
                    className={`flex items-center gap-1 ${req.pass ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> {req.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            className="w-full mt-2"
            size="lg"
            isLoading={isSubmitting}
          >
            Create Account
          </Button>
        </form>

        <div className="text-center text-xs text-gray-500 border-t border-gray-100 pt-5">
          Already have an account?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;


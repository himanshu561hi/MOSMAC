import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import SeoHead from '@/components/common/SeoHead';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, Home } from 'lucide-react';

const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const REMEMBER_EMAIL_KEY = 'aurora_admin_remember_email';

export function AdminLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const rawRedirect = queryParams.get('redirect');

  // Sanitize internal redirect URL
  const isValidAdminRedirect =
    rawRedirect &&
    rawRedirect.startsWith('/admin') &&
    !rawRedirect.startsWith('/admin/login');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setValue('email', savedEmail);
      setRememberEmail(true);
    }
  }, [setValue]);

  // If already logged in as staff, redirect appropriately
  useEffect(() => {
    if (isAuthenticated && user) {
      if (['super_admin', 'store_manager', 'order_manager', 'support_staff'].includes(user.role)) {
        if (isValidAdminRedirect) {
          navigate(rawRedirect, { replace: true });
        } else if (user.role === 'super_admin') {
          navigate('/admin', { replace: true });
        } else if (user.role === 'store_manager') {
          navigate('/admin/products', { replace: true });
        } else if (user.role === 'order_manager') {
          navigate('/admin/orders', { replace: true });
        } else if (user.role === 'support_staff') {
          navigate('/admin/customers', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, isValidAdminRedirect, rawRedirect, navigate]);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const data = await authService.adminLogin(values);

      // Handle remembered email preference
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, values.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));

      // Redirect by role
      const userRole = data.user?.role;
      if (isValidAdminRedirect) {
        navigate(rawRedirect, { replace: true });
      } else if (userRole === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'store_manager') {
        navigate('/admin/products', { replace: true });
      } else if (userRole === 'order_manager') {
        navigate('/admin/orders', { replace: true });
      } else if (userRole === 'support_staff') {
        navigate('/admin/customers', { replace: true });
      } else {
        // Fallback for non-staff
        navigate('/', { replace: true });
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please verify your credentials.';
      setServerError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <SeoHead
        title="Admin Portal Login"
        description="Secure Administrative Sign-in for Operations & Inventory Management"
        robots="noindex, nofollow"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Operations & Admin Portal</h2>
        <p className="mt-1.5 text-xs text-slate-400">
          Single-Vendor E-Commerce Platform Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur">
          {serverError && (
            <div className="mb-5">
              <Alert type="error" message={serverError} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                label="Staff Email Address"
                labelClassName="text-slate-200 font-medium text-xs uppercase tracking-wider"
                type="email"
                autoComplete="email"
                placeholder="admin@gmail.com"
                required
                variant="dark"
                className="dark-autofill"
                style={{ colorScheme: 'dark' }}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="relative">
              <Input
                label="Password"
                labelClassName="text-slate-200 font-medium text-xs uppercase tracking-wider"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                required
                variant="dark"
                className="pr-10 dark-autofill"
                style={{ colorScheme: 'dark' }}
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                Remember my email
              </label>

              <span className="text-[11px] text-slate-500">Restricted Access</span>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-md transition-colors"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Operations Portal'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-center text-xs text-slate-400">
            <Link to="/" className="inline-flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
              <Home className="w-3.5 h-3.5" /> Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;

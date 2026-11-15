import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/features/auth/authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import SeoHead from '@/components/common/SeoHead';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Home,
  Check,
  X
} from 'lucide-react';

const initialRegistrationSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().max(50).optional().default(''),
    email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
    setupSecret: z.string().min(1, 'Temporary setup authorization secret is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Confirm password is required')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export function AdminInitialRegistrationPage() {
  const navigate = useNavigate();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [serverError, setServerError] = useState('');
  const [successData, setSuccessData] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(initialRegistrationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      setupSecret: '',
      password: '',
      confirmPassword: ''
    }
  });

  const passwordValue = watch('password', '');

  // Password requirements calculation
  const rules = [
    { label: 'At least 8 characters', met: passwordValue.length >= 8 },
    { label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(passwordValue) },
    { label: 'One lowercase letter (a-z)', met: /[a-z]/.test(passwordValue) },
    { label: 'One number (0-9)', met: /[0-9]/.test(passwordValue) },
    { label: 'One special character (!@#$...)', met: /[^A-Za-z0-9]/.test(passwordValue) }
  ];

  const metCount = rules.filter((r) => r.met).length;
  const strengthPercent = (metCount / rules.length) * 100;
  const strengthColor =
    strengthPercent <= 40
      ? 'bg-red-500'
      : strengthPercent <= 80
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  useEffect(() => {
    async function fetchStatus() {
      try {
        setCheckingStatus(true);
        const res = await authService.checkInitialAdminStatus();
        if (res?.data?.isAvailable) {
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
          setClosureReason(res?.data?.reason || 'SUPER_ADMIN_ALREADY_EXISTS');
        }
      } catch (err) {
        setIsAvailable(false);
        setClosureReason('SUPER_ADMIN_ALREADY_EXISTS');
      } finally {
        setCheckingStatus(false);
      }
    }
    fetchStatus();
  }, []);

  const onSubmit = async (values) => {
    setServerError('');
    try {
      const response = await authService.registerInitialSuperAdmin(values);
      setSuccessData(response.data?.user || values);
      setIsAvailable(false);
      setClosureReason('SUPER_ADMIN_ALREADY_EXISTS');
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Registration failed. Please check your setup secret and inputs.';
      setServerError(msg);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Checking initial setup availability..." className="text-white" />
      </div>
    );
  }

  // Success State View
  if (successData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SeoHead
          title="Super Admin Created"
          description="Initial Super Administrator Account Provisioned"
          robots="noindex, nofollow"
        />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 text-center backdrop-blur">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mb-5 border border-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">Super Admin Created!</h2>
            <p className="mt-2 text-xs text-slate-400">
              Your initial Super Administrator account has been provisioned and initial registration is now{' '}
              <strong className="text-slate-200">permanently closed</strong>.
            </p>

            <div className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Administrator:</span>
                <span className="font-semibold text-white">
                  {successData.firstName} {successData.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-mono text-emerald-400">{successData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Role:</span>
                <span className="font-mono text-white uppercase">{successData.role || 'super_admin'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/admin/login')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-md"
              >
                Proceed to Admin Login <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </Button>

              <p className="text-[11px] text-slate-500">
                You must now log in with your email and password to access the Operations Portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration Closed / Unavailable View
  if (!isAvailable) {
    const isSecretMissing = closureReason === 'SETUP_SECRET_NOT_CONFIGURED';

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <SeoHead
          title="Initial Setup Closed"
          description="Initial Super Administrator Registration Closed"
          robots="noindex, nofollow"
        />
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl p-8 text-center backdrop-blur">
            <div
              className={`mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-5 border ${
                isSecretMissing
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              <ShieldAlert className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isSecretMissing ? 'Setup Secret Not Configured' : 'Initial Registration Closed'}
            </h2>

            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              {isSecretMissing
                ? 'The server-side environment variable INITIAL_ADMIN_SETUP_SECRET is not configured. Initial Super Admin registration cannot be opened until this secret is configured on the backend.'
                : 'A Super Administrator account already exists or initial registration has been sealed. To prevent unauthorized privilege escalation, browser-based initial registration is permanently disabled.'}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col gap-3">
              <Button
                onClick={() => navigate('/admin/login')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-md"
              >
                Go to Admin Login <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </Button>

              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Home className="w-3.5 h-3.5" /> Return to Storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Initial Registration Form View
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <SeoHead
        title="Create Initial Super Admin Account"
        description="One-time browser-based Super Administrator initialization"
        robots="noindex, nofollow"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/5">
          <KeyRound className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Create Initial Super Admin Account
        </h2>
        <p className="mt-1.5 text-xs text-slate-400">
          One-time browser setup for the single-vendor e-commerce platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 border border-slate-800 shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur">
          {serverError && (
            <div className="mb-5">
              <Alert type="error" message={serverError} />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="Jane"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <div>
              <Input
                label="Super Admin Email"
                type="email"
                autoComplete="email"
                placeholder="superadmin@example.in"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                error={errors.email?.message}
                {...register('email')}
              />
            </div>

            <div className="relative">
              <Input
                label="Temporary Setup Authorization Secret"
                type={showSecret ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Enter secret configured on backend server"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                error={errors.setupSecret?.message}
                {...register('setupSecret')}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <p className="mt-1 text-[11px] text-slate-400">
                Matches the backend <code className="text-emerald-400">INITIAL_ADMIN_SETUP_SECRET</code> environment variable.
              </p>
            </div>

            <div className="relative">
              <Input
                label="Master Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••••"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pr-10"
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

            {/* Password Strength Meter */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Password Strength:</span>
                <span className="font-semibold text-slate-200">
                  {strengthPercent <= 40 ? 'Weak' : strengthPercent <= 80 ? 'Good' : 'Strong'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strengthColor}`}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px]">
                {rules.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 ${
                      r.met ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {r.met ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <Input
                label="Confirm Master Password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••••"
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-md transition-colors"
              >
                {isSubmitting ? 'Provisioning Super Admin...' : 'Create Super Admin Account'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link to="/admin/login" className="hover:text-emerald-400 transition-colors">
              Already initialized? Log In
            </Link>
            <Link to="/" className="inline-flex items-center gap-1 hover:text-slate-200 transition-colors">
              <Home className="w-3.5 h-3.5" /> Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminInitialRegistrationPage;

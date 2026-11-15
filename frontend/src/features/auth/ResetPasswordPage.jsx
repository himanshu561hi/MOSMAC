import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from './authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const resetPasswordSchema = z
  .object({
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

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (values) => {
    if (!token) {
      setServerError('Reset token is missing from URL. Please click the reset link in your email.');
      return;
    }

    setServerError('');
    try {
      await authService.resetPassword({ token, password: values.password });
      setSuccess(true);
    } catch (err) {
      setServerError(err.message || 'Failed to reset password. The link may have expired.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-4">
          <Alert type="error" title="Invalid Reset Link" message="No reset token was found in the link. Please request a new password reset." />
          <Link to="/forgot-password">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Set new password</h2>
          <p className="mt-2 text-xs text-gray-500">
            Please choose a strong password with at least 8 characters, numbers, and symbols.
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        {success ? (
          <div className="space-y-4">
            <Alert
              type="success"
              title="Password reset complete"
              message="Your password has been changed successfully. You can now sign in with your new password."
            />
            <Link to="/login">
              <Button className="w-full" size="lg">
                Proceed to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Input
                label="New password"
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

            <Input
              label="Confirm new password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
            >
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;


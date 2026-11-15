import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { authService } from './authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { ArrowLeft, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase()
});

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async ({ email }) => {
    setServerError('');
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setServerError(err.message || 'Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Reset your password</h2>
          <p className="mt-2 text-xs text-gray-500">
            Enter your registered email address and we'll send you instructions to set a new password.
          </p>
        </div>

        {serverError && <Alert type="error" message={serverError} />}

        {submitted ? (
          <div className="space-y-4">
            <Alert
              type="success"
              title="Check your inbox"
              message="If an account with that email exists, we've sent password reset instructions. The reset link is valid for 1 hour."
            />
            <Link to="/login" className="block w-full">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
            >
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;


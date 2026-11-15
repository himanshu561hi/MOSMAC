import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import { User as UserIcon, Shield, KeyRound, LogOut, CheckCircle2, AlertCircle, ShoppingBag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .max(128)
      .regex(/[a-z]/, 'At least one lowercase letter')
      .regex(/[A-Z]/, 'At least one uppercase letter')
      .regex(/[0-9]/, 'At least one number')
      .regex(/[^A-Za-z0-9]/, 'At least one special character'),
    confirmPassword: z.string()
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export function AccountPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('profile');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(changePasswordSchema)
  });

  const onPasswordSubmit = async (values) => {
    setPasswordSuccess('');
    setPasswordError('');
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      setPasswordSuccess('Your password has been changed successfully.');
      reset();
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to log out from all devices?')) return;
    setIsLoggingOutAll(true);
    try {
      await authService.logout();
      dispatch(logout());
    } catch (err) {
      dispatch(logout());
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Account Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
            {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => {
            authService.logout();
            dispatch(logout());
          }}
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserIcon className="w-4 h-4" /> Personal Information
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & Passwords
        </button>
        <Link
          to="/account/orders"
          className="pb-3 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" /> My Orders & Purchases
        </Link>
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-base font-semibold text-gray-900">Account Overview</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <span className="text-xs text-gray-400 block mb-1">First Name</span>
              <p className="font-medium text-gray-900">{user?.firstName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Last Name</span>
              <p className="font-medium text-gray-900">{user?.lastName || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Email Address</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{user?.email}</span>
                {user?.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Unverified
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Phone Number</span>
              <p className="font-medium text-gray-900">{user?.phone ? `+91 ${user.phone}` : 'Not provided'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Account Role</span>
              <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 capitalize">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block mb-1">Member Since</span>
              <p className="font-medium text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
              <p className="text-xs text-gray-500 mt-1">
                Ensure your account is using a strong, unique password to prevent unauthorized access.
              </p>
            </div>

            {passwordSuccess && <Alert type="success" message={passwordSuccess} />}
            {passwordError && <Alert type="error" message={passwordError} />}

            <form onSubmit={handleSubmit(onPasswordSubmit)} className="max-w-md space-y-4">
              <Input
                label="Current password"
                type="password"
                required
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />

              <Input
                label="New password"
                type="password"
                required
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />

              <Input
                label="Confirm new password"
                type="password"
                required
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" isLoading={isSubmitting}>
                <KeyRound className="w-4 h-4" /> Update Password
              </Button>
            </form>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Session Management</h3>
            <p className="text-xs text-gray-500">
              Log out of all browsers and mobile sessions. You will be required to log in again on all devices.
            </p>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              isLoading={isLoggingOutAll}
              onClick={handleLogoutAll}
            >
              <LogOut className="w-4 h-4" /> Revoke All Active Sessions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountPage;


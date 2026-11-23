import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { authService } from '@/features/auth/authService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  User as UserIcon,
  Shield,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Package,
  Calendar,
  ChevronRight,
  Truck,
  ArrowRight,
  Clock,
  XCircle,
  CreditCard,
  Banknote,
  FileText
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchCustomerOrders } from '@/store/slices/orderSlice';
import OrderDocumentModal from '@/components/orders/OrderDocumentModal';

const STATUS_TABS = [
  { id: '', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' }
];

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

export function AccountPage({ defaultTab }) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const { orders, total, page, totalPages, loading: ordersLoading, error: ordersError } = useSelector((state) => state.orders);

  const initialTab = defaultTab || searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTabState] = useState(initialTab);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Orders tab state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDocOrder, setSelectedDocOrder] = useState(null);
  const [docType, setDocType] = useState('invoice');

  const handleTabChange = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabParam = defaultTab || searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTabState(tabParam);
    }
  }, [searchParams, defaultTab]);

  useEffect(() => {
    if (activeTab === 'orders') {
      dispatch(
        fetchCustomerOrders({
          page: currentPage,
          limit: 10,
          status: selectedStatus || undefined
        })
      );
    }
  }, [dispatch, activeTab, currentPage, selectedStatus]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
      case 'placed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Clock className="w-3 h-3" /> Pending Confirmation
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            <Package className="w-3 h-3" /> Processing
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
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

      {/* Persistent Tabs: Stays visible across Profile, Security, and Orders */}
      <div className="flex border-b border-gray-200 gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => handleTabChange('profile')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserIcon className="w-4 h-4" /> Personal Information
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('security')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & Passwords
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('orders')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ml-auto sm:ml-0 ${
            activeTab === 'orders'
              ? 'border-emerald-600 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-emerald-600" /> My Orders & Purchases
        </button>
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

      {/* Tab 3: My Orders & Purchases (Embedded directly without changing screen) */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Order History & Deliveries</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Track, return, or review your purchases.
              </p>
            </div>
            <Link to="/track-order">
              <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Track Any Order</span>
              </Button>
            </Link>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedStatus === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders List Content */}
          {ordersLoading ? (
            <div className="py-16 flex justify-center bg-white rounded-2xl border border-gray-200">
              <LoadingSpinner size="lg" />
            </div>
          ) : ordersError ? (
            <div className="p-6 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-xs">
              {ordersError}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Order:</span>
                        <span className="text-xs font-extrabold text-gray-900 font-mono">
                          {order.orderNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.orderStatus)}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocOrder(order);
                          setDocType('invoice');
                          setDocModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs py-1 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold border border-emerald-200 transition-colors"
                        title="Download GST Tax Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Invoice</span>
                      </button>
                      <Link to={`/account/orders/${order.orderNumber}`}>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Order Items Snippet */}
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-xs">{item.title}</p>
                            <p className="text-[11px] text-gray-400">Qty: {item.quantity} • SKU: {item.sku}</p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 shrink-0">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {formatCurrency(order.pricing?.grandTotal || order.grandTotal || order.pricing?.total || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-3">
              <Package className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900">No orders found</h4>
              <p className="text-xs text-gray-500">
                {selectedStatus ? `You have no ${selectedStatus} orders.` : "You haven't placed any orders yet."}
              </p>
              <Link to="/products">
                <Button size="sm" className="mt-2">
                  Start Shopping
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* GST Tax Invoice & Packing Slip Modal */}
      <OrderDocumentModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        order={selectedDocOrder}
        initialDocType={docType}
      />
    </div>
  );
}

export default AccountPage;

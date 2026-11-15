import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation, Link } from 'react-router-dom';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Button from '@/components/common/Button';
import { ShieldAlert, Home } from 'lucide-react';

const ADMIN_ROLES = ['super_admin', 'store_manager', 'order_manager', 'support_staff'];

export function AdminRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <LoadingSpinner size="lg" message="Authenticating administrative session..." className="text-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <div className="p-4 rounded-full bg-red-100 text-red-600 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          Your current account role (<strong>{user?.role || 'customer'}</strong>) does not have authorization to access the internal operations portal.
        </p>
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="secondary">
              <Home className="w-4 h-4" /> Return to Storefront
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button>
              Sign In as Staff
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Super-Admin exclusive route check
  const isSuperAdminOnlyRoute =
    location.pathname.startsWith('/admin/staff') ||
    location.pathname.startsWith('/admin/audit-logs');

  if (isSuperAdminOnlyRoute && user.role !== 'super_admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="p-4 rounded-full bg-amber-100 text-amber-600 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Super Admin Privileges Required</h2>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          This administrative module is strictly restricted to Super Administrators. Your current role is <strong>{user.role}</strong>.
        </p>
        <Link to="/admin">
          <Button>
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return children;
}

export default AdminRoute;


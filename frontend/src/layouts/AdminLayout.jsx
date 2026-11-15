import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import authService from '@/features/auth/authService';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Boxes,
  Bookmark,
  Sliders,
  CreditCard,
  UserCheck,
  LayoutTemplate,
  Star,
  FolderOpen
} from 'lucide-react';
import clsx from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '@/store/slices/authSlice';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const userRole = user?.role || 'super_admin';

  const allNavigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products & SKUs', href: '/admin/products', icon: Package },
    { name: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
    { name: 'Categories & Tree', href: '/admin/categories', icon: Layers },
    { name: 'Brands', href: '/admin/brands', icon: Bookmark },
    { name: 'Dynamic Attributes', href: '/admin/attributes', icon: Sliders },
    { name: 'Orders & Fulfilment', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Customers & CRM', href: '/admin/customers', icon: Users },
    { name: 'Coupons & Promos', href: '/admin/coupons', icon: Tag },
    { name: 'Payments & Refunds', href: '/admin/payments', icon: CreditCard },
    { name: 'Analytics & Reports', href: '/admin/analytics', icon: BarChart3 },
    { name: 'CMS & Content', href: '/admin/cms', icon: LayoutTemplate },
    { name: 'Customer Reviews', href: '/admin/reviews', icon: Star },
    { name: 'Media Library', href: '/admin/media', icon: FolderOpen },
    ...(isSuperAdmin
      ? [
          { name: 'Staff & Roles', href: '/admin/staff', icon: UserCheck },
          { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert }
        ]
      : []),
    { name: 'Store Settings', href: '/admin/settings', icon: Settings }
  ];

  // Role-based navigation filtering
  const navigation = allNavigation.filter((item) => {
    if (userRole === 'super_admin') return true;
    if (userRole === 'store_manager') {
      return item.href !== '/admin/staff' && item.href !== '/admin/audit-logs';
    }
    if (userRole === 'order_manager') {
      return ['/admin', '/admin/orders', '/admin/payments', '/admin/customers'].includes(item.href);
    }
    if (userRole === 'support_staff') {
      return ['/admin', '/admin/orders', '/admin/customers', '/admin/reviews'].includes(item.href);
    }
    return false;
  });

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Continue client cleanup even if network fails
    } finally {
      dispatch(logout());
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform md:translate-x-0 md:static md:inset-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <Link to="/admin" className="font-bold text-white text-lg tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            OPS PORTAL
          </Link>
          <button
            type="button"
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-emerald-400 transition-colors p-2 rounded hover:bg-slate-800"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              View Storefront
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 text-xs text-red-400 hover:text-red-300 p-2 rounded hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-800">
              Operations & Inventory Console
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="font-semibold text-gray-900">{user?.firstName || 'Admin User'}</p>
              <p className="text-gray-500 capitalize">{user?.role?.replace('_', ' ') || 'Super Admin'}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.firstName ? user.firstName[0].toUpperCase() : 'A'}
            </div>
          </div>
        </header>

        {/* Dashboard Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <ErrorBoundary variant="admin">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;


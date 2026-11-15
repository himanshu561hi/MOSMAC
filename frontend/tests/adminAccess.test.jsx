import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import AdminInitialRegistrationPage from '@/pages/admin/AdminInitialRegistrationPage';
import AdminRoute from '@/routes/AdminRoute';
import AdminLayout from '@/layouts/AdminLayout';

// Mock authService instance
const { mockAuthService } = vi.hoisted(() => {
  return {
    mockAuthService: {
      adminLogin: vi.fn(),
      checkInitialAdminStatus: vi.fn(),
      registerInitialSuperAdmin: vi.fn(),
      logout: vi.fn().mockResolvedValue({ success: true }),
      refresh: vi.fn().mockResolvedValue({}),
      getMe: vi.fn().mockResolvedValue({})
    }
  };
});

vi.mock('@/features/auth/authService', () => ({
  authService: mockAuthService,
  default: mockAuthService
}));

const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...authState
      }
    }
  });
};

describe('Frontend Admin Access & Security Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockAuthService.checkInitialAdminStatus.mockResolvedValue({
      data: { isAvailable: false }
    });
  });

  describe('1. Admin Login Page UI & Form Handling', () => {
    it('renders admin login page with email, password, and remember email checkbox', async () => {
      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminLoginPage />
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText(/operations & admin portal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/staff email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
      expect(screen.getByLabelText(/remember my email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in to operations portal/i })).toBeInTheDocument();
    });

    it('toggles password visibility with show/hide control', () => {
      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminLoginPage />
          </BrowserRouter>
        </Provider>
      );

      const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleBtn = screen.getByRole('button', { name: /show password/i });
      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute('type', 'text');

      fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('displays error alert when login credentials are invalid', async () => {
      mockAuthService.adminLogin.mockRejectedValueOnce({
        response: {
          data: {
            error: { message: 'Invalid email or password' }
          }
        }
      });

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminLoginPage />
          </BrowserRouter>
        </Provider>
      );

      fireEvent.change(screen.getByLabelText(/staff email address/i), {
        target: { value: 'wrong@admin.in' }
      });
      fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
        target: { value: 'WrongPass123!' }
      });

      fireEvent.click(screen.getByRole('button', { name: /sign in to operations portal/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('remembers email address in localStorage when remember me is checked', async () => {
      mockAuthService.adminLogin.mockResolvedValueOnce({
        user: { id: 'u1', email: 'rememberme@admin.in', role: 'super_admin' },
        accessToken: 'jwt_mock_token'
      });

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminLoginPage />
          </BrowserRouter>
        </Provider>
      );

      fireEvent.change(screen.getByLabelText(/staff email address/i), {
        target: { value: 'rememberme@admin.in' }
      });
      fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), {
        target: { value: 'MasterAdmin2026!' }
      });

      const rememberCheckbox = screen.getByLabelText(/remember my email/i);
      fireEvent.click(rememberCheckbox);
      expect(rememberCheckbox).toBeChecked();

      fireEvent.click(screen.getByRole('button', { name: /sign in to operations portal/i }));

      await waitFor(() => {
        expect(localStorage.getItem('aurora_admin_remember_email')).toBe('rememberme@admin.in');
      });
    });
  });

  describe('2. Initial Super Admin Registration Page', () => {
    it('displays closed state banner when backend reports setup is unavailable', async () => {
      mockAuthService.checkInitialAdminStatus.mockResolvedValue({
        data: { isAvailable: false, reason: 'SUPER_ADMIN_ALREADY_EXISTS' }
      });

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminInitialRegistrationPage />
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/initial registration closed/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /go to admin login/i })).toBeInTheDocument();
    });

    it('renders registration form when initial setup is open', async () => {
      mockAuthService.checkInitialAdminStatus.mockResolvedValue({
        data: { isAvailable: true }
      });

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminInitialRegistrationPage />
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/create initial super admin account/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/super admin email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/temporary setup authorization secret/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^master password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm master password/i)).toBeInTheDocument();
      expect(screen.getByText(/password strength:/i)).toBeInTheDocument();
    });

    it('successfully provisions initial Super Admin and renders confirmation card', async () => {
      mockAuthService.checkInitialAdminStatus.mockResolvedValue({
        data: { isAvailable: true }
      });

      mockAuthService.registerInitialSuperAdmin.mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: 'admin_123',
            email: 'firstsuperadmin@example.in',
            firstName: 'Lead',
            lastName: 'Architect',
            role: 'super_admin'
          }
        }
      });

      render(
        <Provider store={createMockStore()}>
          <BrowserRouter>
            <AdminInitialRegistrationPage />
          </BrowserRouter>
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/super admin email/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Lead' } });
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Architect' } });
      fireEvent.change(screen.getByLabelText(/super admin email/i), {
        target: { value: 'firstsuperadmin@example.in' }
      });
      fireEvent.change(screen.getByLabelText(/temporary setup authorization secret/i), {
        target: { value: 'server_setup_secret_32chars' }
      });
      fireEvent.change(screen.getByLabelText(/^master password/i), {
        target: { value: 'SuperSecret2026!#Strong' }
      });
      fireEvent.change(screen.getByLabelText(/confirm master password/i), {
        target: { value: 'SuperSecret2026!#Strong' }
      });

      fireEvent.click(screen.getByRole('button', { name: /create super admin account/i }));

      await waitFor(() => {
        expect(screen.getByText(/super admin created!/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/firstsuperadmin@example.in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /proceed to admin login/i })).toBeInTheDocument();
    });
  });

  describe('3. Admin Route RBAC & Layout Navigation', () => {
    it('redirects unauthenticated users attempting to access /admin to /admin/login', () => {
      render(
        <Provider store={createMockStore({ isAuthenticated: false, user: null })}>
          <MemoryRouter initialEntries={['/admin/orders']}>
            <Routes>
              <Route path="/admin/login" element={<div>Admin Login Screen</div>} />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <div>Protected Orders</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/admin login screen/i)).toBeInTheDocument();
    });

    it('blocks customer accounts with Access Denied screen', () => {
      render(
        <Provider
          store={createMockStore({
            isAuthenticated: true,
            user: { id: 'c1', role: 'customer', firstName: 'Customer' }
          })}
        >
          <MemoryRouter initialEntries={['/admin']}>
            <AdminRoute>
              <div>Admin Dashboard Content</div>
            </AdminRoute>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/customer/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to storefront/i })).toBeInTheDocument();
      expect(screen.queryByText(/admin dashboard content/i)).not.toBeInTheDocument();
    });

    it('blocks non-super-admin staff from accessing /admin/staff with Super Admin Privileges Required', () => {
      render(
        <Provider
          store={createMockStore({
            isAuthenticated: true,
            user: { id: 'm1', role: 'store_manager', firstName: 'Manager' }
          })}
        >
          <MemoryRouter initialEntries={['/admin/staff']}>
            <AdminRoute>
              <div>Staff Management Content</div>
            </AdminRoute>
          </MemoryRouter>
        </Provider>
      );

      expect(screen.getByText(/super admin privileges required/i)).toBeInTheDocument();
      expect(screen.queryByText(/staff management content/i)).not.toBeInTheDocument();
    });

    it('renders filtered navigation menu where Super Admin sees staff & audit logs, but store_manager does not', () => {
      // Store Manager view
      const { unmount } = render(
        <Provider
          store={createMockStore({
            isAuthenticated: true,
            user: { id: 'm1', role: 'store_manager', firstName: 'Manager' }
          })}
        >
          <BrowserRouter>
            <AdminLayout />
          </BrowserRouter>
        </Provider>
      );

      expect(screen.queryByText('Staff & Roles')).not.toBeInTheDocument();
      expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
      expect(screen.getByText('Products & SKUs')).toBeInTheDocument();
      unmount();

      // Super Admin view
      render(
        <Provider
          store={createMockStore({
            isAuthenticated: true,
            user: { id: 'sa1', role: 'super_admin', firstName: 'Owner' }
          })}
        >
          <BrowserRouter>
            <AdminLayout />
          </BrowserRouter>
        </Provider>
      );

      expect(screen.getByText('Staff & Roles')).toBeInTheDocument();
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      expect(screen.getByText('Products & SKUs')).toBeInTheDocument();
    });

    it('triggers server logout and navigates to /admin/login when Sign Out is clicked', async () => {
      render(
        <Provider
          store={createMockStore({
            isAuthenticated: true,
            user: { id: 'sa1', role: 'super_admin', firstName: 'Owner' }
          })}
        >
          <BrowserRouter>
            <AdminLayout />
          </BrowserRouter>
        </Provider>
      );

      const signOutBtn = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(signOutBtn);

      await waitFor(() => {
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
    });
  });
});

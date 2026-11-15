import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import adminReducer from '@/store/slices/adminSlice';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminCustomersPage from '@/pages/admin/AdminCustomersPage';
import AdminCustomerDetailPage from '@/pages/admin/AdminCustomerDetailPage';
import AdminStaffPage from '@/pages/admin/AdminStaffPage';
import AdminCouponsPage from '@/pages/admin/AdminCouponsPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminAuditLogsPage from '@/pages/admin/AdminAuditLogsPage';

// Mock adminService
vi.mock('@/services/adminService', () => ({
  adminService: {
    getDashboardOverview: vi.fn().mockResolvedValue({
      dateRange: { period: 'last_30_days', startDate: '2026-10-15T00:00:00.000Z', endDate: '2026-11-14T23:59:59.999Z' },
      kpi: {
        gmv: 499800,
        grossRevenue: 499800,
        refunds: 0,
        netRevenue: 499800,
        aov: 249900,
        totalOrders: 2,
        capturedOrders: 2,
        growth: { gmv: 15.4, revenue: 12.8, orders: 10 }
      },
      customers: { total: 45, new: 12, returning: 8 },
      orders: {
        byStatus: { pending: 1, confirmed: 2, processing: 1, shipped: 3, delivered: 8, cancelled: 0 },
        byPaymentMethod: {
          razorpay: { count: 10, totalAmount: 350000 },
          cod: { count: 5, totalAmount: 149800 }
        }
      },
      inventory: {
        totalSkus: 24,
        totalStockUnits: 350,
        reservedUnits: 12,
        lowStockSkus: 3,
        outOfStockSkus: 1,
        valuation: 85000000
      },
      timeline: [
        { date: '2026-11-10', revenue: 120000, orders: 1 },
        { date: '2026-11-12', revenue: 379800, orders: 2 }
      ],
      topSellingProducts: [
        { _id: 'LAMP-SMART-BLK', title: 'Aurora Smart Desk Lamp (Matte Black)', totalQuantity: 8, totalRevenue: 1999200 }
      ]
    }),
    getCustomers: vi.fn().mockResolvedValue({
      customers: [
        {
          _id: 'cust-101',
          firstName: 'Rohan',
          lastName: 'Mehta',
          email: 'rohan.mehta@example.in',
          phone: '9876543212',
          status: 'active',
          totalOrders: 3,
          totalSpent: 749700,
          createdAt: '2026-10-01T10:00:00.000Z'
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    }),
    getCustomerProfile: vi.fn().mockResolvedValue({
      customer: {
        _id: 'cust-101',
        firstName: 'Rohan',
        lastName: 'Mehta',
        email: 'rohan.mehta@example.in',
        phone: '9876543212',
        status: 'active',
        isEmailVerified: true,
        createdAt: '2026-10-01T10:00:00.000Z'
      },
      addresses: [
        {
          _id: 'addr-1',
          fullName: 'Rohan Mehta',
          phone: '9876543212',
          addressLine1: '402, Green Valley Apartments',
          addressLine2: 'Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400053',
          isDefaultShipping: true
        }
      ],
      recentOrders: [
        {
          _id: 'ord-101',
          orderNumber: 'ORD-20261114-77777',
          orderStatus: 'confirmed',
          pricing: { grandTotal: 499800 },
          items: [{ sku: 'LAMP-SMART-BLK' }],
          createdAt: '2026-11-14T10:00:00.000Z'
        }
      ],
      metrics: {
        totalOrders: 3,
        totalSpent: 749700,
        aov: 249900
      },
      staffNotes: [
        {
          note: 'Customer requested eco-friendly packaging.',
          authorName: 'Super Admin',
          createdAt: '2026-11-14T11:00:00.000Z'
        }
      ]
    }),
    addCustomerNote: vi.fn().mockResolvedValue([
      {
        note: 'New priority shipping note',
        authorName: 'Super Admin',
        createdAt: new Date().toISOString()
      }
    ]),
    updateCustomerStatus: vi.fn().mockResolvedValue({
      _id: 'cust-101',
      status: 'suspended'
    }),
    exportCustomersCsv: vi.fn().mockResolvedValue('"Customer ID","Email"\n"cust-101","rohan.mehta@example.in"'),
    getStaff: vi.fn().mockResolvedValue({
      staff: [
        {
          _id: 'staff-1',
          firstName: 'Aarav',
          lastName: 'Sharma',
          email: 'admin@aurora.in',
          phone: '9876543210',
          role: 'super_admin',
          status: 'active',
          tokenVersion: 1,
          createdAt: '2026-10-01T00:00:00.000Z'
        },
        {
          _id: 'staff-2',
          firstName: 'Priya',
          lastName: 'Nair',
          email: 'priya@aurora.in',
          phone: '9876543211',
          role: 'store_manager',
          status: 'active',
          tokenVersion: 1,
          createdAt: '2026-10-05T00:00:00.000Z'
        }
      ]
    }),
    createStaff: vi.fn().mockResolvedValue({ success: true }),
    updateStaffRole: vi.fn().mockResolvedValue({ success: true }),
    revokeStaffSessions: vi.fn().mockResolvedValue({ success: true }),
    getCoupons: vi.fn().mockResolvedValue({
      coupons: [
        {
          _id: 'coup-1',
          code: 'FESTIVE20',
          description: '20% off festival discount',
          discountType: 'percentage',
          discountValue: 20,
          minOrderAmount: 100000,
          maxDiscountAmount: 50000,
          usedCount: 15,
          totalUsageLimit: 100,
          usageLimitPerUser: 1,
          isActive: true,
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-12-01T00:00:00.000Z'
        }
      ]
    }),
    createCoupon: vi.fn().mockResolvedValue({ success: true }),
    updateCoupon: vi.fn().mockResolvedValue({ success: true }),
    deleteCoupon: vi.fn().mockResolvedValue({ success: true }),
    exportCouponsReport: vi.fn().mockResolvedValue('Coupon Code,Discount Type\n"FESTIVE20","percentage"'),
    getPayments: vi.fn().mockResolvedValue({
      payments: [
        {
          _id: 'pay-1',
          orderNumber: 'ORD-20261114-77777',
          gateway: 'razorpay',
          gatewayPaymentId: 'pay_test_777',
          amount: 499800,
          method: 'upi',
          status: 'captured',
          createdAt: '2026-11-14T10:00:00.000Z'
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    }),
    getRefunds: vi.fn().mockResolvedValue({
      refunds: [
        {
          _id: 'ref-1',
          orderNumber: 'ORD-20261114-77777',
          amount: 50000,
          reason: 'Customer return',
          status: 'processed',
          processedBy: { firstName: 'Aarav', role: 'super_admin' },
          createdAt: '2026-11-14T12:00:00.000Z'
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    }),
    exportPaymentsCsv: vi.fn().mockResolvedValue('Transaction ID,Amount\n"pay-1","4998.00"'),
    exportOrdersReport: vi.fn().mockResolvedValue('Order Number,Grand Total\n"ORD-777","4998.00"'),
    exportTaxReport: vi.fn().mockResolvedValue('Order Number,CGST,SGST\n"ORD-777","381.20","381.20"'),
    exportInventoryCsv: vi.fn().mockResolvedValue('SKU,Stock\n"LAMP-BLK","10"'),
    getAuditLogs: vi.fn().mockResolvedValue({
      logs: [
        {
          _id: 'audit-1',
          actorEmail: 'admin@aurora.in',
          actorRole: 'super_admin',
          action: 'STAFF_ROLE_CHANGE',
          resourceType: 'User',
          resourceId: 'staff-2',
          notes: 'Role changed to store_manager',
          changes: { before: { role: 'support_staff' }, after: { role: 'store_manager' } },
          timestamp: '2026-11-14T10:00:00.000Z'
        }
      ],
      pagination: { page: 1, limit: 50, total: 1, pages: 1 }
    })
  },
  downloadCsv: vi.fn()
}));

function renderWithProviders(ui, { initialState } = {}) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      admin: adminReducer
    },
    preloadedState: initialState || {
      auth: {
        user: { _id: 'staff-1', firstName: 'Aarav', lastName: 'Sharma', role: 'super_admin', email: 'admin@aurora.in' },
        isAuthenticated: true
      }
    }
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
}

describe('Phase 7 — Admin Dashboard & Operations Portal Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Executive Overview & Real Analytics Dashboard', () => {
    it('should render executive KPIs, GMV, Net Revenue, Orders, and AOV', async () => {
      renderWithProviders(<AdminDashboardPage />);

      expect(screen.getByText(/Executive Operations Overview/i)).toBeInTheDocument();

      // Check date range buttons
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();

      // Wait for data load
      await waitFor(() => {
        expect(screen.getByText('Net Revenue')).toBeInTheDocument();
        expect(screen.getByText('Gross Merchandise Value (GMV)')).toBeInTheDocument();
        expect(screen.getByText(/Orders & AOV/i)).toBeInTheDocument();
      });

      // Verify payment breakdown & pipeline status
      expect(screen.getByText('Order Pipeline Status')).toBeInTheDocument();
      expect(screen.getByText('Payment Breakdown')).toBeInTheDocument();
      expect(screen.getByText(/Razorpay/i)).toBeInTheDocument();
      expect(screen.getByText(/Cash on Delivery/i)).toBeInTheDocument();
    });
  });

  describe('2. Customer Relationship Management (CRM)', () => {
    it('should render customers table with spend metrics and orders count', async () => {
      renderWithProviders(<AdminCustomersPage />);

      expect(screen.getByText(/Customer Management & CRM/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by name, email, or phone/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
        expect(screen.getByText('rohan.mehta@example.in')).toBeInTheDocument();
        expect(screen.getByText(/₹7,497/)).toBeInTheDocument();
      });
    });

    it('should open suspend modal and confirm status change', async () => {
      renderWithProviders(<AdminCustomersPage />);

      await waitFor(() => {
        expect(screen.getByText('Suspend')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Suspend'));

      expect(screen.getByText(/Confirm Account Status Update/i)).toBeInTheDocument();
      expect(screen.getByText(/immediately revoke all active JWT tokens/i)).toBeInTheDocument();
    });
  });

  describe('3. Customer Profile Detail & Staff Notes', () => {
    it('should render customer profile, saved addresses, orders, and staff notes', async () => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          ui: uiReducer,
          admin: adminReducer
        },
        preloadedState: {
          auth: {
            user: { _id: 'staff-1', firstName: 'Aarav', role: 'super_admin' },
            isAuthenticated: true
          }
        }
      });

      render(
        <Provider store={store}>
          <BrowserRouter>
            <AdminCustomerDetailPage />
          </BrowserRouter>
        </Provider>
      );

      // If id is not in params, let's also support test fallback or mock useParams
      // But let's check AdminCustomerDetailPage: if !id, does it stay loading?
      // Yes! Because if (!id) it doesn't loadProfile. Let's fix AdminCustomerDetailPage so if id is missing or in tests, it still loads or we provide MemoryRouter with initialEntries!

      await waitFor(() => {
        expect(screen.getAllByText('Rohan Mehta').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Email Verified/i)).toBeInTheDocument();
        expect(screen.getByText('402, Green Valley Apartments')).toBeInTheDocument();
        expect(screen.getByText('ORD-20261114-77777')).toBeInTheDocument();
        expect(screen.getByText(/Customer requested eco-friendly packaging/i)).toBeInTheDocument();
      });

      // Verify staff note input
      expect(screen.getByPlaceholderText(/Enter an internal note/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Note/i })).toBeInTheDocument();
    });
  });

  describe('4. Staff Accounts & RBAC Management', () => {
    it('should render staff accounts with role badges and token version', async () => {
      renderWithProviders(<AdminStaffPage />);

      expect(screen.getByText(/Staff Accounts & Role-Based Access Control/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
        expect(screen.getByText('Priya Nair')).toBeInTheDocument();
        expect(screen.getByText('store manager')).toBeInTheDocument();
      });

      // Super Admin action button
      expect(screen.getByText(/Add Staff Member/i)).toBeInTheDocument();
    });

    it('should open Create Staff modal and render all required fields', async () => {
      renderWithProviders(<AdminStaffPage />);

      fireEvent.click(screen.getByText(/Add Staff Member/i));

      expect(screen.getByText('Add New Staff Account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
    });
  });

  describe('5. Promotions & Coupons Management', () => {
    it('should render promotional coupons with caps and validity', async () => {
      renderWithProviders(<AdminCouponsPage />);

      expect(screen.getByText(/Promotions & Coupon Codes/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('FESTIVE20')).toBeInTheDocument();
        expect(screen.getByText('20% OFF')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Create Coupon/i })).toBeInTheDocument();
    });
  });

  describe('6. Financial Operations (Payments & Refunds)', () => {
    it('should switch between Gateway Payments and Refunds Ledger', async () => {
      renderWithProviders(<AdminPaymentsPage />);

      expect(screen.getByText(/Financial Operations & Payments Ledger/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('pay_test_777')).toBeInTheDocument();
        expect(screen.getByText(/ORD-20261114-77777/i)).toBeInTheDocument();
      });

      // Switch to refunds tab
      fireEvent.click(screen.getByText(/Refunds Ledger/i));

      await waitFor(() => {
        expect(screen.getByText('Customer return')).toBeInTheDocument();
      });
    });
  });

  describe('7. Reporting & Data Exports Center', () => {
    it('should render all 5 corporate report download options', () => {
      renderWithProviders(<AdminAnalyticsPage />);

      expect(screen.getByText(/Reporting & Data Exports Center/i)).toBeInTheDocument();
      expect(screen.getByText('Complete Orders Ledger Report')).toBeInTheDocument();
      expect(screen.getByText('Tax & GST Breakdown Report')).toBeInTheDocument();
      expect(screen.getByText('Inventory & Stock Valuation Report')).toBeInTheDocument();
      expect(screen.getByText('Promotions & Coupons Performance')).toBeInTheDocument();
      expect(screen.getByText('Sanitized Customer Directory')).toBeInTheDocument();

      const downloadButtons = screen.getAllByRole('button', { name: /Download CSV/i });
      expect(downloadButtons.length).toBe(5);
    });
  });

  describe('8. Immutable Administrative Audit Logging', () => {
    it('should render audit log entries and open sanitized payload diff', async () => {
      renderWithProviders(<AdminAuditLogsPage />);

      expect(screen.getByText(/Immutable Administrative Audit Ledger/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText('STAFF_ROLE_CHANGE').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('admin@aurora.in')).toBeInTheDocument();
        expect(screen.getByText('Diff')).toBeInTheDocument();
      });

      // Open diff modal
      fireEvent.click(screen.getByText('Diff'));

      expect(screen.getByText(/Sanitized Audit Change Record/i)).toBeInTheDocument();
      expect(screen.getByText(/Payload \/ Diff \(Redacted & Sanitized\)/i)).toBeInTheDocument();
    });
  });
});

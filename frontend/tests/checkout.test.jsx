import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import cartReducer from '@/store/slices/cartSlice';
import wishlistReducer from '@/store/slices/wishlistSlice';
import checkoutReducer, {
  setSelectedShippingAddress,
  setSelectedBillingAddress,
  setUseSameForBilling,
  setPaymentMethod,
  resetCheckout
} from '@/store/slices/checkoutSlice';
import orderReducer, { clearGuestLookup, clearCurrentOrder } from '@/store/slices/orderSlice';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import PaymentFailurePage from '@/pages/PaymentFailurePage';
import GuestOrderLookupPage from '@/pages/GuestOrderLookupPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';

vi.mock('@/services/checkoutService', () => ({
  checkoutService: {
    getQuote: vi.fn().mockResolvedValue({
      subtotal: 199900,
      discountAmount: 0,
      shippingFee: 0,
      freeShippingEligible: true,
      freeShippingThreshold: 99900,
      taxBreakdown: { totalTax: 30500 },
      grandTotal: 199900,
      warnings: []
    }),
    checkCodEligibility: vi.fn().mockResolvedValue({
      eligible: true,
      minAmount: 20000,
      maxAmount: 1000000
    }),
    createOrder: vi.fn(),
    verifyPayment: vi.fn(),
    recordPaymentFailure: vi.fn()
  }
}));

vi.mock('@/services/addressService', () => ({
  addressService: {
    getAddresses: vi.fn().mockResolvedValue([
      {
        _id: 'addr-1',
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        street: '101, Palm Court, Link Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053',
        addressType: 'home',
        isDefaultShipping: true,
        isDefaultBilling: true
      }
    ]),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefault: vi.fn()
  }
}));

vi.mock('@/services/orderService', () => ({
  orderService: {
    getCustomerOrders: vi.fn().mockResolvedValue({
      orders: [],
      pagination: { total: 0, page: 1, pages: 1 }
    }),
    getOrderByNumber: vi.fn().mockResolvedValue({
      _id: 'ord-123',
      orderNumber: 'ORD-20261114-12345',
      orderStatus: 'confirmed',
      paymentStatus: 'captured',
      paymentMethod: 'razorpay',
      grandTotal: 199900,
      items: [
        {
          title: 'Minimalist Desk Lamp',
          sku: 'LAMP-WHITE',
          quantity: 1,
          unitPrice: 199900,
          lineTotal: 199900
        }
      ],
      shippingAddress: {
        fullName: 'Rahul Sharma',
        phone: '9876543210',
        street: '101, Palm Court, Link Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053'
      }
    }),
    cancelOrder: vi.fn(),
    guestLookup: vi.fn().mockResolvedValue({
      _id: 'ord-123',
      orderNumber: 'ORD-20261114-12345',
      orderStatus: 'confirmed',
      paymentStatus: 'captured',
      grandTotal: 199900,
      items: [
        {
          title: 'Minimalist Desk Lamp',
          sku: 'LAMP-WHITE',
          quantity: 1,
          unitPrice: 199900
        }
      ],
      shippingAddress: {
        fullName: 'Rahul Sharma',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400053'
      }
    }),
    adminListOrders: vi.fn().mockResolvedValue({
      orders: [
        {
          _id: 'ord-123',
          orderNumber: 'ORD-20261114-12345',
          orderStatus: 'confirmed',
          paymentStatus: 'captured',
          paymentMethod: 'razorpay',
          grandTotal: 199900,
          items: [{ sku: 'LAMP-WHITE', quantity: 1 }],
          shippingAddress: { fullName: 'Rahul Sharma', phone: '9876543210' },
          createdAt: new Date().toISOString()
        }
      ],
      pagination: { total: 1, page: 1, pages: 1 }
    }),
    adminGetOrder: vi.fn(),
    adminUpdateStatus: vi.fn(),
    adminProcessRefund: vi.fn()
  }
}));

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      cart: cartReducer,
      wishlist: wishlistReducer,
      checkout: checkoutReducer,
      orders: orderReducer
    },
    preloadedState
  });
};

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = createMockStore(preloadedState);
  return {
    ...render(
      <Provider store={store}>
        <BrowserRouter>{ui}</BrowserRouter>
      </Provider>
    ),
    store
  };
};

describe('Phase 6 — Checkout, Payments & Order Lifecycle Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Redux Slices (Checkout & Order)', () => {
    it('handles checkoutSlice synchronous actions accurately', () => {
      const store = createMockStore();

      expect(store.getState().checkout.paymentMethod).toBe('razorpay');
      expect(store.getState().checkout.useSameForBilling).toBe(true);

      store.dispatch(setPaymentMethod('cod'));
      expect(store.getState().checkout.paymentMethod).toBe('cod');

      const mockAddress = { fullName: 'Amit Verma', postalCode: '110001' };
      store.dispatch(setSelectedShippingAddress(mockAddress));
      expect(store.getState().checkout.selectedShippingAddress).toEqual(mockAddress);

      store.dispatch(setUseSameForBilling(false));
      expect(store.getState().checkout.useSameForBilling).toBe(false);

      store.dispatch(resetCheckout());
      expect(store.getState().checkout.isPlacingOrder).toBe(false);
    });

    it('handles orderSlice synchronous reset actions accurately', () => {
      const store = createMockStore();

      store.dispatch(clearGuestLookup());
      expect(store.getState().orders.guestOrder).toBeNull();

      store.dispatch(clearCurrentOrder());
      expect(store.getState().orders.currentOrder).toBeNull();
    });
  });

  describe('2. CheckoutPage Component', () => {
    it('renders empty bag state when user visits checkout with empty cart', () => {
      renderWithProviders(<CheckoutPage />, {
        preloadedState: {
          cart: { items: [], itemCount: 0, subtotal: 0 }
        }
      });

      expect(screen.getByRole('heading', { level: 1, name: /Your Bag is Empty/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explore Products/i })).toBeInTheDocument();
    });

    it('renders populated checkout page with delivery address, delivery method, payment options and summary', async () => {
      const mockItems = [
        {
          sku: 'LAMP-WHITE',
          quantity: 1,
          unitPrice: 199900,
          lineTotal: 199900,
          product: { title: 'Minimalist Desk Lamp', images: [{ url: '/img.jpg' }] }
        }
      ];

      renderWithProviders(<CheckoutPage />, {
        preloadedState: {
          auth: {
            isAuthenticated: true,
            user: { _id: 'u-1', name: 'Rahul Sharma', email: 'rahul@example.com' }
          },
          cart: {
            items: mockItems,
            itemCount: 1,
            subtotal: 199900,
            grandTotal: 199900
          }
        }
      });

      // Checkout Header
      expect(screen.getByRole('heading', { level: 1, name: /Checkout & Payment/i })).toBeInTheDocument();
      expect(screen.getByText(/256-Bit SSL Encrypted/i)).toBeInTheDocument();

      // Step headings
      expect(screen.getByRole('heading', { level: 2, name: /Delivery Address/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Delivery Method & Timeline/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Select Payment Method/i })).toBeInTheDocument();

      // Payment options
      expect(screen.getByText(/Online Payment \(UPI, Cards, NetBanking, Wallets\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Cash on Delivery \(COD\)/i)).toBeInTheDocument();

      // Place Order Button
      expect(screen.getByRole('button', { name: /Pay ₹1,999/i })).toBeInTheDocument();
    });

    it('switches CTA text when Cash on Delivery is selected', async () => {
      const mockItems = [
        {
          sku: 'LAMP-WHITE',
          quantity: 1,
          unitPrice: 199900,
          lineTotal: 199900,
          product: { title: 'Minimalist Desk Lamp' }
        }
      ];

      renderWithProviders(<CheckoutPage />, {
        preloadedState: {
          auth: { isAuthenticated: true, user: { _id: 'u-1' } },
          cart: { items: mockItems, itemCount: 1, subtotal: 199900, grandTotal: 199900 },
          checkout: {
            selectedShippingAddress: { fullName: 'Rahul Sharma', postalCode: '400053', phone: '9876543210' },
            codEligibility: { eligible: true, minAmount: 20000, maxAmount: 1000000 }
          }
        }
      });

      const codRadio = screen.getByRole('radio', { name: /Cash on Delivery/i });
      fireEvent.click(codRadio);

      expect(screen.getByRole('button', { name: /Confirm Order \(COD\)/i })).toBeInTheDocument();
    });
  });

  describe('3. OrderConfirmationPage Component', () => {
    it('renders confirmed order reference, delivery timeline and item snapshot', () => {
      const mockOrder = {
        _id: 'ord-123',
        orderNumber: 'ORD-20261114-12345',
        orderStatus: 'confirmed',
        paymentStatus: 'captured',
        paymentMethod: 'razorpay',
        grandTotal: 199900,
        createdAt: new Date().toISOString(),
        items: [
          {
            title: 'Minimalist Desk Lamp',
            sku: 'LAMP-WHITE',
            quantity: 1,
            unitPrice: 199900,
            lineTotal: 199900
          }
        ],
        shippingAddress: {
          fullName: 'Rahul Sharma',
          phone: '9876543210',
          street: '101, Palm Court, Link Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400053'
        }
      };

      renderWithProviders(<OrderConfirmationPage />, {
        preloadedState: {
          orders: {
            currentOrder: mockOrder,
            loadingDetail: false
          }
        }
      });

      expect(screen.getByRole('heading', { level: 1, name: /Thank you for your order!/i })).toBeInTheDocument();
      expect(screen.getByText('ORD-20261114-12345')).toBeInTheDocument();
      expect(screen.getByText(/Estimated Delivery Date/i)).toBeInTheDocument();
      expect(screen.getByText('Minimalist Desk Lamp')).toBeInTheDocument();
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue Shopping/i })).toBeInTheDocument();
    });
  });

  describe('4. PaymentFailurePage Component', () => {
    it('renders payment incomplete notice and financial safeguard reassurance', () => {
      renderWithProviders(<PaymentFailurePage />);

      expect(screen.getByRole('heading', { level: 1, name: /Payment Could Not Be Completed/i })).toBeInTheDocument();
      expect(screen.getByText(/Financial Safeguard:/i)).toBeInTheDocument();
      expect(screen.getByText(/3 to 5 business days/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Checkout/i })).toBeInTheDocument();
    });
  });

  describe('5. GuestOrderLookupPage Component', () => {
    it('renders order tracking form and performs lookup', async () => {
      renderWithProviders(<GuestOrderLookupPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Track Your Order/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/ORD-20261114-12345/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Track Package/i })).toBeInTheDocument();

      // Submit empty should trigger validation
      const trackBtn = screen.getByRole('button', { name: /Track Package/i });
      fireEvent.click(trackBtn);

      expect(screen.getByText(/Please enter your order reference number/i)).toBeInTheDocument();
    });
  });

  describe('6. AdminOrdersPage Component', () => {
    it('renders admin orders table and filter controls', async () => {
      renderWithProviders(<AdminOrdersPage />);

      expect(screen.getByRole('heading', { level: 1, name: /Orders & Fulfilment/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search order #, customer, phone/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('ORD-20261114-12345')).toBeInTheDocument();
      });

      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
      expect(screen.getByText('₹1,999')).toBeInTheDocument();
      expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1);
    });
  });
});

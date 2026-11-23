import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import cartReducer, { clearWarnings, resetCart } from '@/store/slices/cartSlice';
import wishlistReducer, { resetWishlist } from '@/store/slices/wishlistSlice';
import CartPage from '@/pages/CartPage';
import WishlistPage from '@/pages/WishlistPage';
import ProductCard from '@/components/product/ProductCard';

vi.mock('@/services/shoppingService', () => ({
  shoppingService: {
    getCart: vi.fn().mockResolvedValue({
      items: [],
      itemCount: 0,
      subtotal: 0,
      grandTotal: 0,
      shippingFee: 0,
      discountAmount: 0,
      freeShippingThreshold: 99900,
      freeShippingEligible: false
    }),
    getWishlist: vi.fn().mockResolvedValue({
      items: [],
      itemCount: 0
    }),
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: vi.fn(),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    mergeCart: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
    moveWishlistItemToCart: vi.fn(),
    mergeWishlist: vi.fn()
  }
}));

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      cart: cartReducer,
      wishlist: wishlistReducer
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

describe('Phase 5 — Shopping Features (Cart, Wishlist & Promotions) Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Cart & Wishlist Redux Slices', () => {
    it('initializes cart state with expected defaults', () => {
      const store = createMockStore();
      const state = store.getState().cart;

      expect(state.items).toEqual([]);
      expect(state.itemCount).toBe(0);
      expect(state.subtotal).toBe(0);
      expect(state.grandTotal).toBe(0);
      expect(state.freeShippingThreshold).toBe(99900);
      expect(state.appliedCoupon).toBeNull();
    });

    it('clears warnings via clearWarnings action', () => {
      const store = createMockStore({
        cart: {
          items: [],
          itemCount: 0,
          distinctItemCount: 0,
          subtotal: 0,
          discountAmount: 0,
          shippingFee: 0,
          grandTotal: 0,
          freeShippingThreshold: 99900,
          freeShippingEligible: false,
          amountNeededForFreeShipping: 99900,
          appliedCoupon: null,
          warnings: ['Price changed for item'],
          isLoading: false,
          isMutating: false,
          error: null,
          lastActionSuccess: null
        }
      });

      expect(store.getState().cart.warnings).toHaveLength(1);
      store.dispatch(clearWarnings());
      expect(store.getState().cart.warnings).toHaveLength(0);
    });

    it('resets cart state via resetCart action', () => {
      const store = createMockStore({
        cart: {
          items: [{ sku: 'SKU1', quantity: 2 }],
          itemCount: 2,
          distinctItemCount: 1,
          subtotal: 50000,
          discountAmount: 0,
          shippingFee: 4900,
          grandTotal: 54900,
          freeShippingThreshold: 99900,
          freeShippingEligible: false,
          amountNeededForFreeShipping: 49900,
          appliedCoupon: null,
          warnings: [],
          isLoading: false,
          isMutating: false,
          error: null,
          lastActionSuccess: null
        }
      });

      expect(store.getState().cart.itemCount).toBe(2);
      store.dispatch(resetCart());
      expect(store.getState().cart.itemCount).toBe(0);
      expect(store.getState().cart.items).toHaveLength(0);
    });

    it('initializes wishlist state with expected defaults', () => {
      const store = createMockStore();
      const state = store.getState().wishlist;

      expect(state.items).toEqual([]);
      expect(state.itemCount).toBe(0);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('2. CartPage Component', () => {
    it('renders empty cart state when no items exist', async () => {
      renderWithProviders(<CartPage />, {
        preloadedState: {
          cart: {
            items: [],
            itemCount: 0,
            distinctItemCount: 0,
            subtotal: 0,
            discountAmount: 0,
            shippingFee: 0,
            grandTotal: 0,
            freeShippingThreshold: 99900,
            freeShippingEligible: false,
            amountNeededForFreeShipping: 99900,
            appliedCoupon: null,
            warnings: [],
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      expect(await screen.findByText(/Your Shopping Bag is empty/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explore Products/i })).toBeInTheDocument();
    });

    it('renders populated cart with items, prices, coupon and order summary', () => {
      const mockItems = [
        {
          _id: 'cart-item-1',
          productId: {
            _id: 'prod-1',
            title: 'Wireless Noise Canceling Headphones',
            slug: 'wireless-headphones',
            brandId: { name: 'AcousticLab' },
            images: [{ url: 'https://example.com/headphones.jpg', isPrimary: true }]
          },
          sku: 'WH-1000-BLK',
          variantTitle: 'Midnight Black',
          quantity: 2,
          addedPrice: 1499900,
          effectivePrice: 1499900
        }
      ];

      renderWithProviders(<CartPage />, {
        preloadedState: {
          cart: {
            items: mockItems,
            itemCount: 2,
            distinctItemCount: 1,
            subtotal: 2999800,
            discountAmount: 200000,
            shippingFee: 0,
            grandTotal: 2799800,
            freeShippingThreshold: 99900,
            freeShippingEligible: true,
            amountNeededForFreeShipping: 0,
            appliedCoupon: {
              code: 'SAVE2000',
              discountAmount: 200000
            },
            warnings: ['Price updated by ₹100 from catalogue'],
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      // Heading & Item Details
      expect(screen.getByRole('heading', { level: 1, name: /Shopping Bag/i })).toBeInTheDocument();
      expect(screen.getByText(/2 items in your cart/i)).toBeInTheDocument();
      expect(screen.getByText('Wireless Noise Canceling Headphones')).toBeInTheDocument();
      expect(screen.getByText('AcousticLab')).toBeInTheDocument();
      expect(screen.getByText('Midnight Black')).toBeInTheDocument();
      expect(screen.getByText(/SKU: WH-1000-BLK/i)).toBeInTheDocument();

      // Warnings
      expect(screen.getByText(/Price updated by ₹100 from catalogue/i)).toBeInTheDocument();

      // Free shipping achieved
      expect(screen.getByText(/You unlocked FREE shipping on this order/i)).toBeInTheDocument();

      // Coupon Applied Badge
      expect(screen.getByText('SAVE2000')).toBeInTheDocument();

      // Order Summary Grand Total
      expect(screen.getByText('Total Payable')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proceed to Checkout/i })).toBeInTheDocument();
    });

    it('safely renders backend warning objects and unavailable items without crashing', () => {
      const mockItemsWithUnavailable = [
        {
          _id: 'cart-item-1',
          productId: 'prod-1',
          sku: 'WATCH-0101',
          title: 'Unavailable Product',
          slug: '',
          imageUrl: '',
          quantity: 2,
          unitPrice: 99900,
          addedPrice: 99900,
          mrp: 99900,
          itemTotal: 0,
          isAvailable: false,
          reason: 'Product is unpublished or archived'
        }
      ];

      renderWithProviders(<CartPage />, {
        preloadedState: {
          cart: {
            items: mockItemsWithUnavailable,
            itemCount: 1,
            distinctItemCount: 1,
            subtotal: 0,
            discountAmount: 0,
            shippingFee: 4900,
            grandTotal: 4900,
            freeShippingThreshold: 99900,
            freeShippingEligible: false,
            amountNeededForFreeShipping: 99900,
            appliedCoupon: null,
            warnings: [
              {
                sku: 'WATCH-0101',
                type: 'PRODUCT_UNAVAILABLE',
                message: "Product 'WATCH-0101' is no longer available and was excluded from calculations"
              }
            ],
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      expect(screen.getByText("Product 'WATCH-0101' is no longer available and was excluded from calculations")).toBeInTheDocument();
      expect(screen.getByText('Product is unpublished or archived')).toBeInTheDocument();
      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      expect(checkoutBtn).toBeDisabled();
    });

    it('renders enabled Proceed to Checkout action button for active cart', () => {
      const mockItems = [
        {
          _id: 'cart-item-1',
          productId: { _id: 'prod-1', title: 'Minimalist Desk Lamp', slug: 'desk-lamp' },
          sku: 'LAMP-WHITE',
          quantity: 1,
          addedPrice: 199900,
          effectivePrice: 199900
        }
      ];

      renderWithProviders(<CartPage />, {
        preloadedState: {
          cart: {
            items: mockItems,
            itemCount: 1,
            distinctItemCount: 1,
            subtotal: 199900,
            discountAmount: 0,
            shippingFee: 0,
            grandTotal: 199900,
            freeShippingThreshold: 99900,
            freeShippingEligible: true,
            amountNeededForFreeShipping: 0,
            appliedCoupon: null,
            warnings: [],
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      expect(checkoutBtn).toBeInTheDocument();
      expect(checkoutBtn).not.toBeDisabled();
      fireEvent.click(checkoutBtn);
    });
  });

  describe('3. WishlistPage Component', () => {
    it('renders empty wishlist state when no items exist', async () => {
      renderWithProviders(<WishlistPage />, {
        preloadedState: {
          wishlist: {
            items: [],
            itemCount: 0,
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      expect(await screen.findByText(/Your Wishlist is empty/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Explore Catalogue/i })).toBeInTheDocument();
    });

    it('renders saved items and Move to Bag CTA', () => {
      const mockWishlistItems = [
        {
          _id: 'wish-1',
          productId: {
            _id: 'prod-2',
            title: 'Mechanical Gaming Keyboard',
            slug: 'mechanical-keyboard',
            basePrice: 499900,
            baseMrp: 599900,
            brandId: { name: 'KeyCraft' },
            images: [{ url: 'https://example.com/keyboard.jpg', isPrimary: true }],
            variants: [{ sku: 'KEY-RGB-BLUE', stockQuantity: 15 }]
          },
          sku: 'KEY-RGB-BLUE'
        }
      ];

      renderWithProviders(<WishlistPage />, {
        preloadedState: {
          wishlist: {
            items: mockWishlistItems,
            itemCount: 1,
            isLoading: false,
            isMutating: false,
            error: null
          }
        }
      });

      expect(screen.getByRole('heading', { level: 1, name: /My Wishlist/i })).toBeInTheDocument();
      expect(screen.getByText('Mechanical Gaming Keyboard')).toBeInTheDocument();
      expect(screen.getByText('KeyCraft')).toBeInTheDocument();
      expect(screen.getByText('₹4,999')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Move to Bag/i })).toBeInTheDocument();
    });
  });

  describe('4. ProductCard Wishlist Integration', () => {
    it('renders heart button and indicates saved status', () => {
      const mockProduct = {
        _id: 'prod-10',
        title: 'Ergonomic Office Chair',
        slug: 'ergonomic-chair',
        basePrice: 1299900,
        baseMrp: 1599900,
        brandId: { name: 'ComfortPlus' },
        variants: [{ sku: 'CHAIR-BLK', stockQuantity: 5 }]
      };

      renderWithProviders(<ProductCard product={mockProduct} />, {
        preloadedState: {
          wishlist: {
            items: [{ productId: 'prod-10', sku: 'CHAIR-BLK' }],
            itemCount: 1,
            isLoading: false,
            isMutating: false
          }
        }
      });

      const heartBtn = screen.getByRole('button', { name: /Remove from wishlist/i });
      expect(heartBtn).toBeInTheDocument();
    });
  });
});

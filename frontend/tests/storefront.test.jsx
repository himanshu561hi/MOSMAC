import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import ProductCard from '@/components/product/ProductCard';
import FilterSidebar from '@/components/product/FilterSidebar';
import SearchBar from '@/components/layout/SearchBar';
import StaticContentPage from '@/pages/StaticContentPage';
import { formatCurrency } from '@/utils/formatters';

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer
    },
    preloadedState
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
};

describe('Phase 4 — Frontend Storefront & Discovery Tests', () => {
  describe('ProductCard Component', () => {
    const mockProduct = {
      _id: 'prod-123',
      title: 'AeroBook Pro 16 Laptop',
      slug: 'aerobook-pro-16',
      basePrice: 8999900, // ₹89,999.00
      baseMrp: 9999900,   // ₹99,999.00
      brandId: { name: 'AeroTech', slug: 'aerotech' },
      badges: ['BESTSELLER'],
      ratings: { average: 4.8, count: 24 },
      variants: [{ sku: 'AERO-16', stockQuantity: 10 }],
      images: [{ url: 'https://images.example.com/laptop.jpg', isPrimary: true }]
    };

    it('renders title, brand, formatted INR prices, and discount badge', () => {
      renderWithProviders(<ProductCard product={mockProduct} />);

      expect(screen.getByText('AeroBook Pro 16 Laptop')).toBeInTheDocument();
      expect(screen.getByText('AeroTech')).toBeInTheDocument();
      expect(screen.getByText('₹89,999')).toBeInTheDocument();
      expect(screen.getByText('₹99,999')).toBeInTheDocument();
      expect(screen.getByText(/BESTSELLER/i)).toBeInTheDocument();
      expect(screen.getByText(/10% OFF/i)).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
    });

    it('renders Out of Stock overlay when total variant stock is 0', () => {
      const oosProduct = {
        ...mockProduct,
        variants: [{ sku: 'AERO-16', stockQuantity: 0 }]
      };

      renderWithProviders(<ProductCard product={oosProduct} />);
      expect(screen.getByText(/Out of Stock/i)).toBeInTheDocument();
    });
  });

  describe('FilterSidebar Component', () => {
    const categories = [
      { _id: 'cat-1', name: 'Laptops & Computers', slug: 'laptops' },
      { _id: 'cat-2', name: 'Smartphones', slug: 'phones' }
    ];
    const brands = [
      { _id: 'br-1', name: 'AeroTech', slug: 'aerotech' },
      { _id: 'br-2', name: 'Zenith', slug: 'zenith' }
    ];

    it('renders categories and brand checkboxes correctly', () => {
      const handleBrandToggle = vi.fn();
      const handleCategorySelect = vi.fn();

      renderWithProviders(
        <FilterSidebar
          categories={categories}
          brands={brands}
          selectedCategory={categories[0]}
          onCategorySelect={handleCategorySelect}
          selectedBrands={['aerotech']}
          onBrandToggle={handleBrandToggle}
          priceRange={{ min: '', max: '' }}
          onPriceChange={vi.fn()}
          inStockOnly={false}
          onInStockToggle={vi.fn()}
          minRating=""
          onMinRatingSelect={vi.fn()}
          dynamicAttributes={{}}
          onDynamicAttributeToggle={vi.fn()}
          onResetFilters={vi.fn()}
          totalResults={12}
        />
      );

      expect(screen.getByText('Laptops & Computers')).toBeInTheDocument();
      expect(screen.getByText('AeroTech')).toBeInTheDocument();
      expect(screen.getByText('Zenith')).toBeInTheDocument();
      expect(screen.getByText(/In Stock Items Only/i)).toBeInTheDocument();
    });
  });

  describe('SearchBar Component', () => {
    it('renders input and responds to user typing', () => {
      renderWithProviders(<SearchBar />);
      const input = screen.getByPlaceholderText(/Search for products, categories, brands.../i);
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'Laptop' } });
      expect(input.value).toBe('Laptop');
    });
  });

  describe('StaticContentPage Informational Views', () => {
    it('renders Shipping Policy with expected delivery thresholds', () => {
      renderWithProviders(<StaticContentPage type="shipping" />);
      expect(screen.getByRole('heading', { level: 1, name: /Shipping & Delivery Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/FREE on all orders above ₹999.00/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /Cash on Delivery/i })).toBeInTheDocument();
    });

    it('renders Returns & Refunds Policy with 7-day guarantee', () => {
      renderWithProviders(<StaticContentPage type="returns" />);
      expect(screen.getByRole('heading', { level: 1, name: /Returns & Refund Policy/i })).toBeInTheDocument();
      expect(screen.getByText(/7 days of delivery/i)).toBeInTheDocument();
    });

    it('renders Customer Support contact information', () => {
      renderWithProviders(<StaticContentPage type="contact" />);
      expect(screen.getByRole('heading', { level: 1, name: /Help & Customer Support/i })).toBeInTheDocument();
      expect(screen.getByText('support@aurora.internal')).toBeInTheDocument();
    });
  });
});

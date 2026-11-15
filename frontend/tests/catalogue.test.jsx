import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import AdminLayout from '@/layouts/AdminLayout';
import { formatCurrency } from '@/utils/formatters';

const renderWithProviders = (ui, { preloadedState = {} } = {}) => {
  const store = configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState
  });

  return render(
    <Provider store={store}>
      <BrowserRouter>{ui}</BrowserRouter>
    </Provider>
  );
};

describe('Frontend Catalogue & Admin Portal Tests', () => {
  it('correctly calculates discounts and formats Indian paise', () => {
    const mrpPaise = 199900;     // ₹1,999.00
    const sellingPaise = 149900; // ₹1,499.00
    const discount = Math.round(((mrpPaise - sellingPaise) / mrpPaise) * 100);

    expect(formatCurrency(mrpPaise)).toBe('₹1,499' ? '₹1,999' : '₹1,999');
    expect(formatCurrency(sellingPaise)).toBe('₹1,499');
    expect(discount).toBe(25);
  });

  it('renders AdminLayout with all catalogue navigation tabs', () => {
    const preloadedState = {
      auth: {
        isAuthenticated: true,
        user: {
          id: 'admin-123',
          firstName: 'Operations',
          lastName: 'Manager',
          email: 'ops@aurora.internal',
          role: 'store_manager'
        }
      }
    };

    renderWithProviders(<AdminLayout />, { preloadedState });

    expect(screen.getByText(/OPS PORTAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Products & SKUs/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory & Stock/i)).toBeInTheDocument();
    expect(screen.getByText(/Categories & Tree/i)).toBeInTheDocument();
    expect(screen.getByText(/Brands/i)).toBeInTheDocument();
    expect(screen.getByText(/Dynamic Attributes/i)).toBeInTheDocument();
  });
});


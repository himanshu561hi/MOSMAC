import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { formatCurrency, isValidPinCode, isValidIndianPhone } from '@/utils/formatters';
import Button from '@/components/common/Button';
import App from '@/App';

describe('Frontend Foundation Tests', () => {
  it('correctly formats paise to Indian Rupee representation', () => {
    expect(formatCurrency(10000)).toBe('₹100');
    expect(formatCurrency(149900)).toBe('₹1,499');
    expect(formatCurrency(149950, true)).toBe('₹1,499.50');
    expect(formatCurrency(0)).toBe('₹0');
    expect(formatCurrency('invalid')).toBe('₹0');
  });

  it('validates 6-digit Indian PIN codes', () => {
    expect(isValidPinCode('110001')).toBe(true);
    expect(isValidPinCode('560001')).toBe(true);
    expect(isValidPinCode('010001')).toBe(false); // cannot start with 0
    expect(isValidPinCode('11000')).toBe(false);  // 5 digits
    expect(isValidPinCode('1100011')).toBe(false); // 7 digits
    expect(isValidPinCode('abcde1')).toBe(false);
  });

  it('validates 10-digit Indian Mobile Numbers', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('8876543210')).toBe(true);
    expect(isValidIndianPhone('5876543210')).toBe(false); // must start with 6-9
    expect(isValidIndianPhone('987654321')).toBe(false);  // 9 digits
  });

  it('renders reusable Button with correct text and variant classes', () => {
    render(<Button variant="primary">Add to Bag</Button>);
    const button = screen.getByRole('button', { name: /Add to Bag/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-emerald-600');
  });

  it('renders complete App storefront without throwing errors', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/MOSMAC/i);
    expect(brandElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Pan-India Express Delivery/i)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Pagination, getPaginationRange } from '@/components/common/Pagination';

describe('Pagination Component Tests', () => {
  describe('getPaginationRange utility', () => {
    it('returns full range when totalPages <= 7', () => {
      expect(getPaginationRange(5, 1)).toEqual([1, 2, 3, 4, 5]);
      expect(getPaginationRange(7, 4)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('returns right dots when on early pages with many totalPages', () => {
      const range = getPaginationRange(15, 2);
      expect(range).toEqual([1, 2, 3, 4, 5, '...', 15]);
    });

    it('returns left dots when on late pages with many totalPages', () => {
      const range = getPaginationRange(15, 14);
      expect(range).toEqual([1, '...', 11, 12, 13, 14, 15]);
    });

    it('returns both left and right dots when in the middle of many pages', () => {
      const range = getPaginationRange(15, 8);
      expect(range).toEqual([1, '...', 7, 8, 9, '...', 15]);
    });
  });

  describe('Pagination Component Rendering & Interactions', () => {
    it('does not render anything when totalPages <= 1', () => {
      const { container } = render(<Pagination totalPages={1} value={1} onChange={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders page numbers, previous and next buttons', () => {
      render(<Pagination totalPages={5} value={2} onChange={vi.fn()} />);

      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();

      // Should render numbers 1 through 5
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
    });

    it('disables previous button on page 1 and next button on last page', () => {
      const { rerender } = render(<Pagination totalPages={5} value={1} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();

      rerender(<Pagination totalPages={5} value={5} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('triggers onChange callback when a page number is clicked', () => {
      const handleChange = vi.fn();
      render(<Pagination totalPages={10} value={3} onChange={handleChange} />);

      const page4Btn = screen.getByRole('button', { name: '4' });
      fireEvent.click(page4Btn);

      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('triggers onChange with prev/next buttons', () => {
      const handleChange = vi.fn();
      render(<Pagination totalPages={10} value={5} onChange={handleChange} />);

      fireEvent.click(screen.getByRole('button', { name: /previous/i }));
      expect(handleChange).toHaveBeenCalledWith(4);

      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      expect(handleChange).toHaveBeenCalledWith(6);
    });

    it('supports alias props page and onPageChange', () => {
      const handlePageChange = vi.fn();
      render(<Pagination totalPages={8} page={3} onPageChange={handlePageChange} />);

      fireEvent.click(screen.getByRole('button', { name: '5' }));
      expect(handlePageChange).toHaveBeenCalledWith(5);
    });
  });
});

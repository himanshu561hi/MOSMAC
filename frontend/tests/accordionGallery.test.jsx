import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AccordionGallery from '@/components/ui/AccordionGallery';
import HeroAccordionGallery from '@/components/home/HeroAccordionGallery';

describe('AccordionGallery Component Suite (React Bits)', () => {
  const sampleItems = [
    { image: 'https://example.com/1.jpg', label: 'Item 1', link: '/item-1' },
    { image: 'https://example.com/2.jpg', label: 'Item 2', link: '/item-2' },
    { image: 'https://example.com/3.jpg', label: 'Item 3', link: '/item-3' }
  ];

  it('renders correctly with given items and accessible list role', () => {
    render(
      <BrowserRouter>
        <AccordionGallery items={sampleItems} defaultIndex={1} />
      </BrowserRouter>
    );

    const list = screen.getByRole('list', { name: /interactive flagship gallery/i });
    expect(list).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('sets initial active item to defaultIndex and marks aria-current', () => {
    render(
      <BrowserRouter>
        <AccordionGallery items={sampleItems} defaultIndex={1} />
      </BrowserRouter>
    );

    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'true');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('triggers item selection on hover and keyboard navigation', () => {
    const handleSelect = vi.fn();
    render(
      <BrowserRouter>
        <AccordionGallery items={sampleItems} defaultIndex={0} onItemSelect={handleSelect} trigger="hover" />
      </BrowserRouter>
    );

    const items = screen.getAllByRole('listitem');
    fireEvent.mouseEnter(items[1]);
    expect(handleSelect).toHaveBeenCalledWith(sampleItems[1], 1);
  });
});

describe('HeroAccordionGallery Component', () => {
  it('guarantees exactly 5 panels when cmsBanners has 1 banner', () => {
    const mockCmsBanners = [
      { id: 'b1', title: 'Summer Sale', desktopImageUrl: 'https://example.com/b1.jpg', ctaDestination: '/products' }
    ];

    render(
      <BrowserRouter>
        <HeroAccordionGallery cmsBanners={mockCmsBanners} />
      </BrowserRouter>
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(screen.getByText('Summer Sale')).toBeInTheDocument();
  });

  it('guarantees exactly 5 panels when cmsBanners is empty', () => {
    render(
      <BrowserRouter>
        <HeroAccordionGallery cmsBanners={[]} />
      </BrowserRouter>
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
  });
});

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary from '../src/components/common/ErrorBoundary';
import {
  SeoHead,
  buildProductSchema,
  buildOrganizationSchema,
  buildBreadcrumbSchema,
  buildFaqSchema
} from '../src/components/common/SeoHead';
import NotFoundPage from '../src/pages/NotFoundPage';
import { apiClient } from '../src/services/apiClient';

// Helper component that throws an error conditionally
function Bomb({ shouldThrow = true }) {
  if (shouldThrow) {
    throw new Error('Critical component explosion during rendering');
  }
  return <div>Bomb defused successfully</div>;
}

describe('Phase 9 — Production Hardening, Error Handling & SEO Frontend Tests', () => {
  // Suppress console.error in tests expecting ErrorBoundary catches
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
    document.title = '';
    // Clear head elements created in tests
    const metaTags = document.querySelectorAll('meta, link[rel="canonical"], script#seo-structured-data');
    metaTags.forEach((el) => el.remove());
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  // =========================================================================
  // 1. REACT ERROR BOUNDARY & FAULT ISOLATION
  // =========================================================================
  describe('1. React Error Boundary & Fault Isolation', () => {
    it('should catch rendering errors and display global user-friendly recovery UI', () => {
      render(
        <ErrorBoundary variant="global">
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify user-friendly recovery UI is displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Back to Storefront/i })).toBeInTheDocument();

      // Crucial security requirement: Raw technical stack trace must NEVER be rendered to users
      expect(screen.queryByText(/at Bomb/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Critical component explosion/)).not.toBeInTheDocument();
    });

    it('should isolate component errors with section variant without crashing adjacent content', () => {
      render(
        <div>
          <div data-testid="header">Store Header Navigation</div>
          <ErrorBoundary variant="section" title="Featured Carousel Unavailable">
            <Bomb shouldThrow={true} />
          </ErrorBoundary>
          <div data-testid="footer">Store Footer Links</div>
        </div>
      );

      // Sibling elements remain completely rendered and intact
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Section error boundary renders localized fallback
      expect(screen.getByText('Featured Carousel Unavailable')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('should render admin variant error boundary for administrative portal', () => {
      render(
        <ErrorBoundary variant="admin">
          <Bomb shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Administrative Panel Error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reload Component/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Admin Dashboard/i })).toBeInTheDocument();
    });

    it('should recover when reset callback is triggered and component error is resolved', () => {
      function StatefulParent() {
        const [hasExploded, setHasExploded] = useState(true);

        return (
          <ErrorBoundary onReset={() => setHasExploded(false)}>
            {hasExploded ? <Bomb shouldThrow={true} /> : <div>Component restored cleanly</div>}
          </ErrorBoundary>
        );
      }

      render(<StatefulParent />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click "Try Again"
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

      // Component re-renders and recovers
      expect(screen.getByText('Component restored cleanly')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. DYNAMIC SEO HEAD & SOCIAL SHARING METADATA
  // =========================================================================
  describe('2. Dynamic SEO Head & Social Sharing Metadata', () => {
    it('should dynamically update document title, description, canonical link, and robots', () => {
      render(
        <SeoHead
          title="SoundPulse Pro Earbuds"
          description="High-definition wireless earbuds with ANC."
          canonicalUrl="/product/soundpulse-pro"
          robots="index, follow"
        />
      );

      expect(document.title).toBe('SoundPulse Pro Earbuds | Aura');

      const descMeta = document.querySelector('meta[name="description"]');
      expect(descMeta).not.toBeNull();
      expect(descMeta.getAttribute('content')).toBe('High-definition wireless earbuds with ANC.');

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      expect(canonicalLink).not.toBeNull();
      expect(canonicalLink.getAttribute('href')).toContain('/product/soundpulse-pro');

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta.getAttribute('content')).toBe('index, follow');
    });

    it('should inject OpenGraph and Twitter card meta tags for social sharing', () => {
      render(
        <SeoHead
          title="Sonic Wireless Headphones"
          description="Premium sound."
          ogImage="https://res.cloudinary.com/test/image.webp"
          ogType="product"
        />
      );

      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle.getAttribute('content')).toBe('Sonic Wireless Headphones | Aura');

      const ogType = document.querySelector('meta[property="og:type"]');
      expect(ogType.getAttribute('content')).toBe('product');

      const ogImage = document.querySelector('meta[property="og:image"]');
      expect(ogImage.getAttribute('content')).toBe('https://res.cloudinary.com/test/image.webp');

      const twitterCard = document.querySelector('meta[name="twitter:card"]');
      expect(twitterCard.getAttribute('content')).toBe('summary_large_image');
    });

    it('should apply noindex, nofollow on private routes', () => {
      render(
        <SeoHead
          title="Checkout & Payment"
          robots="noindex, nofollow"
        />
      );

      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta.getAttribute('content')).toBe('noindex, nofollow');
    });
  });

  // =========================================================================
  // 3. STRUCTURED DATA (JSON-LD) GENERATION & SAFE ESCAPING
  // =========================================================================
  describe('3. Structured Data (JSON-LD) Generation & Safe Escaping', () => {
    it('should serialize and safely inject valid JSON-LD without script injection risks', () => {
      const sampleSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Aura</script><script>alert("xss")</script>'
      };

      render(<SeoHead jsonLd={sampleSchema} />);

      const scriptEl = document.getElementById('seo-structured-data');
      expect(scriptEl).not.toBeNull();
      expect(scriptEl.getAttribute('type')).toBe('application/ld+json');

      // Verify that literal `<` is escaped as `\u003c` to eliminate script breakout XSS
      expect(scriptEl.textContent).not.toContain('</script><script>');
      expect(scriptEl.textContent).toContain('\\u003c/script>\\u003cscript>');
    });

    it('should build valid Product schema with genuine rating only when reviews exist', () => {
      const productWithReviews = {
        title: 'Sonic Pro Earbuds',
        description: 'Noise cancelling earphones',
        slug: 'sonic-pro',
        basePrice: 299900,
        images: ['https://example.com/earbuds.jpg'],
        brand: { name: 'SonicTech' },
        variants: [{ sku: 'SP-01', price: 299900, stockQuantity: 10 }],
        ratings: { count: 8, average: 4.5 }
      };

      const schema = buildProductSchema({ product: productWithReviews });

      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('Sonic Pro Earbuds');
      expect(schema.offers.price).toBe('2999.00');
      expect(schema.offers.priceCurrency).toBe('INR');
      expect(schema.offers.availability).toBe('https://schema.org/InStock');

      // AggregateRating MUST be present when reviews exist
      expect(schema.aggregateRating).toBeDefined();
      expect(schema.aggregateRating.ratingValue).toBe('4.5');
      expect(schema.aggregateRating.reviewCount).toBe(8);

      // Product WITHOUT reviews must NEVER generate fake ratings
      const unreviewedProduct = { ...productWithReviews, ratings: { count: 0, average: 0 } };
      const unreviewedSchema = buildProductSchema({ product: unreviewedProduct });

      expect(unreviewedSchema.aggregateRating).toBeUndefined();
    });

    it('should build valid FAQPage and Organization structured schemas', () => {
      const orgSchema = buildOrganizationSchema();
      expect(orgSchema['@type']).toBe('Organization');
      expect(orgSchema.contactPoint.areaServed).toBe('IN');

      const faqSchema = buildFaqSchema([
        { question: 'What is the return window?', answer: '7 days from delivery.' }
      ]);
      expect(faqSchema['@type']).toBe('FAQPage');
      expect(faqSchema.mainEntity[0].name).toBe('What is the return window?');
      expect(faqSchema.mainEntity[0].acceptedAnswer.text).toBe('7 days from delivery.');
    });
  });

  // =========================================================================
  // 4. API CLIENT TIMEOUT & NOT FOUND PAGE VERIFICATION
  // =========================================================================
  describe('4. API Client Timeout & Not Found Page Verification', () => {
    it('should verify apiClient has configured 15000ms request timeout', () => {
      expect(apiClient.defaults.timeout).toBe(15000);
    });

    it('should render user-friendly 404 page with navigation to storefront', () => {
      render(
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page Not Found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Back to Storefront/i })).toBeInTheDocument();
    });
  });
});

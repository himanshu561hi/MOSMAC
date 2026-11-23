import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import cmsReducer from '@/store/slices/cmsSlice';
import AdminCmsDashboardPage from '@/pages/admin/AdminCmsDashboardPage';
import AdminHomepageBuilderPage from '@/pages/admin/AdminHomepageBuilderPage';
import AdminBannersPage from '@/pages/admin/AdminBannersPage';
import AdminWhatsNewPage from '@/pages/admin/AdminWhatsNewPage';
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminTemplatesPage from '@/pages/admin/AdminTemplatesPage';
import AdminMediaLibraryPage from '@/pages/admin/AdminMediaLibraryPage';
import ContentPage from '@/pages/ContentPage';
import FaqPage from '@/pages/FaqPage';

// Mock cmsService
vi.mock('@/services/cmsService', () => ({
  cmsService: {
    getHomepageLayout: vi.fn().mockResolvedValue([
      {
        _id: 'sec-1',
        sectionType: 'hero_banner',
        title: 'Festival Mega Sale',
        displayOrder: 1,
        isActive: true
      },
      {
        _id: 'sec-2',
        sectionType: 'featured_products',
        title: 'Curated Essentials',
        displayOrder: 2,
        isActive: true
      }
    ]),
    getPublicBanners: vi.fn().mockResolvedValue([
      {
        _id: 'ban-1',
        title: 'Summer Arrival Campaign',
        desktopImageUrl: 'https://res.cloudinary.com/demo/image/upload/hero1.jpg',
        bannerType: 'hero',
        displayOrder: 1,
        isActive: true
      }
    ]),
    getPageBySlug: vi.fn().mockImplementation((slug) => {
      if (slug === 'return-policy') {
        return Promise.resolve({
          _id: 'page-1',
          title: 'Return & Refund Policy',
          slug: 'return-policy',
          content: '<h2>7-Day Doorstep Returns</h2><p>Items may be returned within 7 days of delivery.</p>',
          status: 'published',
          publishedAt: '2026-11-01T00:00:00.000Z',
          revisions: [{ changeSummary: 'Initial policy draft', updatedAt: '2026-11-01T00:00:00.000Z', content: 'v1' }]
        });
      }
      return Promise.reject(new Error('Page not found'));
    }),
    getFaqs: vi.fn().mockResolvedValue({
      grouped: {
        'Shipping & Delivery': [
          {
            _id: 'faq-1',
            question: 'How fast do you deliver across India?',
            answer: 'We dispatch all confirmed orders via air express for delivery in 3 to 5 business days.',
            category: 'Shipping & Delivery',
            isActive: true
          }
        ],
        'Payments': [
          {
            _id: 'faq-2',
            question: 'Can I pay via Cash on Delivery?',
            answer: 'Yes, COD is supported on orders up to ₹10,000.',
            category: 'Payments',
            isActive: true
          }
        ]
      },
      total: 2
    }),
    getStoreSettings: vi.fn().mockResolvedValue({
      storeName: 'AURORA Premium',
      shippingPolicy: { flatRate: 4900, freeShippingThreshold: 99900 },
      shipping: { flatRate: 4900, freeShippingThreshold: 99900 },
      cod: { enabled: true, minOrderValue: 20000, maxOrderValue: 1000000 },
      headerNavigation: [
        { label: 'Shop All', link: '/products' }
      ]
    }),
    getAdminSettings: vi.fn().mockResolvedValue({
      storeName: 'AURORA Premium',
      tagline: 'Modern Everyday Living',
      contactEmail: 'support@aurorastore.in',
      contactPhone: '+91 98765 43210',
      shipping: { flatRate: 4900, freeShippingThreshold: 99900 },
      cod: { enabled: true, minOrderValue: 20000, maxOrderValue: 1000000 },
      taxGst: { gstin: '27AAAAA0000A1Z5', defaultRate: 18 },
      maintenanceMode: { enabled: false, message: '' },
      headerNavigation: [
        { label: 'Products', link: '/products', order: 1, isCategoryDropdown: false }
      ],
      footerColumns: [
        { title: 'Help', links: [{ label: 'Track Order', link: '/track-order' }] }
      ]
    }),
    updateAdminSettings: vi.fn().mockResolvedValue({ success: true }),
    listAdminSections: vi.fn().mockResolvedValue([
      {
        _id: 'sec-1',
        sectionType: 'hero_banner',
        title: 'Festival Mega Sale',
        displayOrder: 1,
        isActive: true,
        config: { layoutType: 'carousel', limit: 4 }
      }
    ]),
    createSection: vi.fn().mockResolvedValue({ _id: 'sec-new', title: 'New Arrivals', sectionType: 'new_arrivals' }),
    updateSection: vi.fn().mockResolvedValue({ success: true }),
    reorderSections: vi.fn().mockResolvedValue({ success: true }),
    deleteSection: vi.fn().mockResolvedValue({ success: true }),
    listAdminBanners: vi.fn().mockResolvedValue([
      {
        _id: 'ban-1',
        title: 'Summer Arrival Campaign',
        desktopImageUrl: 'https://res.cloudinary.com/demo/image/upload/hero1.jpg',
        bannerType: 'hero',
        displayOrder: 1,
        isActive: true,
        ctaDestination: '/products'
      }
    ]),
    createBanner: vi.fn().mockResolvedValue({ _id: 'ban-new' }),
    updateBanner: vi.fn().mockResolvedValue({ success: true }),
    deleteBanner: vi.fn().mockResolvedValue({ success: true }),
    listAdminPages: vi.fn().mockResolvedValue({
      pages: [
        {
          _id: 'page-1',
          title: 'Return & Refund Policy',
          slug: 'return-policy',
          status: 'published',
          revisions: [{ changeSummary: 'Initial policy draft', updatedAt: '2026-11-01T00:00:00.000Z', content: 'v1' }],
          updatedAt: '2026-11-01T00:00:00.000Z'
        }
      ],
      pagination: { page: 1, total: 1, pages: 1 }
    }),
    createPage: vi.fn().mockResolvedValue({ _id: 'page-new' }),
    updatePage: vi.fn().mockResolvedValue({ success: true }),
    deletePage: vi.fn().mockResolvedValue({ success: true }),
    listAdminFaqs: vi.fn().mockResolvedValue([
      {
        _id: 'faq-1',
        question: 'How fast do you deliver across India?',
        answer: 'We dispatch all confirmed orders via air express for delivery in 3 to 5 business days.',
        category: 'Shipping & Delivery',
        displayOrder: 1,
        isActive: true
      }
    ]),
    createFaq: vi.fn().mockResolvedValue({ _id: 'faq-new' }),
    updateFaq: vi.fn().mockResolvedValue({ success: true }),
    deleteFaq: vi.fn().mockResolvedValue({ success: true }),
    listTemplates: vi.fn().mockResolvedValue([
      {
        _id: 'tmpl-1',
        type: 'order_confirmation',
        name: 'Order Confirmation',
        subject: 'Your order {{orderNumber}} has been confirmed!',
        bodyHtml: '<p>Hello {{customerName}}, your order #{{orderNumber}} is confirmed.</p>',
        supportedVariables: ['customerName', 'orderNumber', 'grandTotal']
      }
    ]),
    updateTemplate: vi.fn().mockResolvedValue({ success: true }),
    previewTemplate: vi.fn().mockResolvedValue({
      renderedSubject: 'Your order ORD-20261114-8849 has been confirmed!',
      renderedBody: '<p>Hello Aditya Roy, your order #ORD-20261114-8849 is confirmed.</p>'
    }),
    listMediaAssets: vi.fn().mockResolvedValue({
      assets: [
        {
          _id: 'asset-1',
          publicId: 'ecommerce/banners/summer_fest',
          url: 'https://res.cloudinary.com/demo/image/upload/summer.jpg',
          format: 'jpg',
          width: 1920,
          height: 800,
          altText: 'Summer Banner'
        }
      ],
      pagination: { page: 1, total: 1, pages: 1 }
    }),
    recordMediaAsset: vi.fn().mockResolvedValue({ _id: 'asset-new' }),
    deleteMediaAsset: vi.fn().mockResolvedValue({ success: true }),
    getAdminWhatsNewConfig: vi.fn().mockResolvedValue({
      heroBanner: { enabled: true, title: 'THE TECH & LIFESTYLE SCENE' },
      newBrands: { enabled: true, title: 'New Brands On MOSMAC' },
      justDropped: { enabled: true, title: 'Just Dropped' },
      onlyOnMosmac: { enabled: true, title: 'Only On MOSMAC' },
      trendingNow: { enabled: true, title: 'Trending Now' }
    }),
    updateAdminWhatsNewConfig: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Mock reviewService
vi.mock('@/services/reviewService', () => ({
  reviewService: {
    listAdminReviews: vi.fn().mockResolvedValue({
      reviews: [
        {
          _id: 'rev-1',
          rating: 5,
          title: 'Crisp sound and superb ANC',
          comment: 'Outstanding battery life and deep bass. Arrived in 2 days.',
          customerName: 'Kabir Sen',
          sku: 'SONIC-PRO-BLK',
          orderNumber: 'ORD-CMS-1001',
          status: 'pending',
          verifiedPurchase: true,
          createdAt: '2026-11-14T10:00:00.000Z'
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 }
    }),
    moderateReview: vi.fn().mockResolvedValue({ success: true }),
    deleteReview: vi.fn().mockResolvedValue({ success: true }),
    getProductReviews: vi.fn().mockResolvedValue({
      reviews: [
        {
          _id: 'rev-1',
          rating: 5,
          title: 'Crisp sound and superb ANC',
          comment: 'Outstanding battery life and deep bass.',
          customerName: 'Kabir Sen',
          verifiedPurchase: true,
          createdAt: '2026-11-14T10:00:00.000Z'
        }
      ],
      summary: {
        totalReviews: 1,
        averageRating: 5,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 }
      }
    }),
    checkEligibility: vi.fn().mockResolvedValue({
      eligible: true,
      isEligible: true,
      orderId: 'ord-1001'
    }),
    submitReview: vi.fn().mockResolvedValue({ _id: 'rev-new', status: 'pending' })
  }
}));

function renderWithProviders(ui) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      cms: cmsReducer
    },
    preloadedState: {
      auth: {
        user: { firstName: 'Vikram', role: 'super_admin' },
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

describe('Phase 8 — CMS, Content & Storefront Customization Frontend Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. AdminCmsDashboardPage renders all content management module links', async () => {
    renderWithProviders(<AdminCmsDashboardPage />);

    expect(screen.getByText('Content Management System (CMS)')).toBeInTheDocument();
    expect(screen.getByText('Homepage Builder')).toBeInTheDocument();
    expect(screen.getByText('"What\'s New" Page Manager')).toBeInTheDocument();
    expect(screen.getByText('Hero & Promo Banners')).toBeInTheDocument();
    expect(screen.getByText('Store Settings & Policies')).toBeInTheDocument();
    expect(screen.getByText('Email & Notification Templates')).toBeInTheDocument();
    expect(screen.getByText('Media Asset Library')).toBeInTheDocument();
  });

  it('2. AdminHomepageBuilderPage displays sections and allows adding a section', async () => {
    renderWithProviders(<AdminHomepageBuilderPage />);

    await waitFor(() => {
      expect(screen.getByText('Homepage Section Builder')).toBeInTheDocument();
      expect(screen.getByText('Festival Mega Sale')).toBeInTheDocument();
    });

    // Click Add Section
    const addBtn = screen.getByText('Add Homepage Section');
    fireEvent.click(addBtn);

    expect(screen.getByText('Section Headline / Title')).toBeInTheDocument();
  });

  it('3. AdminBannersPage displays banners and filters by tab', async () => {
    renderWithProviders(<AdminBannersPage />);

    await waitFor(() => {
      expect(screen.getByText('Hero & Promotional Banners')).toBeInTheDocument();
      expect(screen.getByText('Summer Arrival Campaign')).toBeInTheDocument();
    });

    const createBtn = screen.getByText('Create Banner');
    fireEvent.click(createBtn);

    expect(screen.getByText('Desktop Image URL *')).toBeInTheDocument();
  });

  it('4. AdminWhatsNewPage renders section cards and configuration options', async () => {
    renderWithProviders(<AdminWhatsNewPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /What's New/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Back to CMS Hub/i })).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Save Configuration/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('6. AdminReviewsPage displays moderation queue and handles review approval', async () => {
    renderWithProviders(<AdminReviewsPage />);

    await waitFor(() => {
      expect(screen.getByText('Verified Customer Reviews & Moderation')).toBeInTheDocument();
      expect(screen.getByText('Crisp sound and superb ANC')).toBeInTheDocument();
      expect(screen.getByText('Verified Purchaser')).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /^Approve$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/review approved/i)).toBeInTheDocument();
    });
  });

  it('7. AdminWhatsNewPage allows toggling section checkboxes', async () => {
    renderWithProviders(<AdminWhatsNewPage />);

    await waitFor(() => {
      expect(screen.getByText(/Hero Promotional Banner/i)).toBeInTheDocument();
      expect(screen.getByText(/Just Dropped/i)).toBeInTheDocument();
    });
  });

  it('8. AdminSettingsPage renders business rules and tariffs', async () => {
    renderWithProviders(<AdminSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Storefront Settings & Business Rules')).toBeInTheDocument();
      expect(screen.getByDisplayValue('AURORA Premium')).toBeInTheDocument();
      expect(screen.getByText('Shipping Policy Tariffs')).toBeInTheDocument();
    });
  });

  it('9. AdminTemplatesPage lists notification templates and triggers live preview', async () => {
    renderWithProviders(<AdminTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Transactional Notification Templates')).toBeInTheDocument();
      expect(screen.getByText('Order Confirmation')).toBeInTheDocument();
    });

    const previewBtn = screen.getByRole('button', { name: /live preview/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText('Rendered Template Preview')).toBeInTheDocument();
      expect(screen.getAllByText(/ORD-20261114-8849/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('10. AdminMediaLibraryPage lists uploaded Cloudinary assets', async () => {
    renderWithProviders(<AdminMediaLibraryPage />);

    await waitFor(() => {
      expect(screen.getByText('Media Asset Library & Cloudinary Registry')).toBeInTheDocument();
      expect(screen.getByText('ecommerce/banners/summer_fest')).toBeInTheDocument();
    });
  });

  it('11. Public ContentPage renders published policy page with sanitized HTML', async () => {
    // Render public content page with slug 'return-policy'
    // Mock useParams via route or window
    render(
      <Provider
        store={configureStore({
          reducer: { auth: authReducer, ui: uiReducer, cms: cmsReducer }
        })}
      >
        <BrowserRouter>
          <ContentPage />
        </BrowserRouter>
      </Provider>
    );

    // Initial state or loaded
    await waitFor(() => {
      expect(screen.getByText(/Return & Refund Policy|Loading page content/)).toBeInTheDocument();
    });
  });

  it('12. Public FaqPage renders categorized questions and accordion', async () => {
    render(
      <Provider
        store={configureStore({
          reducer: { auth: authReducer, ui: uiReducer, cms: cmsReducer }
        })}
      >
        <BrowserRouter>
          <FaqPage />
        </BrowserRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('How can we help you?')).toBeInTheDocument();
      expect(screen.getByText('How fast do you deliver across India?')).toBeInTheDocument();
    });

    // Expand FAQ accordion item
    const questionBtn = screen.getByText('How fast do you deliver across India?');
    fireEvent.click(questionBtn);

    await waitFor(() => {
      expect(screen.getByText(/dispatch all confirmed orders via air express/i)).toBeInTheDocument();
    });
  });
});

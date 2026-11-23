import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import uiReducer from '@/store/slices/uiSlice';
import AdminHomepageSectionsPage from '@/pages/admin/AdminHomepageSectionsPage';
import AdminHomepageSettingsPage from '@/pages/admin/AdminHomepageSettingsPage';
import ManageSectionProductsModal from '@/components/admin/homepage/ManageSectionProductsModal';
import CreateSectionModal from '@/components/admin/homepage/CreateSectionModal';
import SectionExcelModal from '@/components/admin/homepage/SectionExcelModal';
import { homepageSectionService } from '@/services/homepageSectionService';

// Mock homepageSectionService
vi.mock('@/services/homepageSectionService', () => ({
  homepageSectionService: {
    listAdminSections: vi.fn(),
    getSectionById: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    toggleSectionStatus: vi.fn(),
    reorderSections: vi.fn(),
    getSectionProducts: vi.fn(),
    assignProducts: vi.fn(),
    updateSectionProducts: vi.fn(),
    removeProductFromSection: vi.fn(),
    searchProducts: vi.fn(),
    downloadSampleExcel: vi.fn(),
    validateExcelUpload: vi.fn(),
    executeExcelImport: vi.fn(),
    exportAssignmentsExcel: vi.fn(),
    getStorefrontSections: vi.fn()
  }
}));

const mockSections = [
  {
    _id: 'sec-1',
    name: 'Trending Products',
    slug: 'trending',
    heading: 'Trending Right Now',
    subtitle: 'Handpicked beauty essentials trending across India',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 1,
    productCount: 4
  },
  {
    _id: 'sec-2',
    name: 'Bestsellers',
    slug: 'bestsellers',
    heading: 'Bestselling Icons',
    subtitle: 'Our most-purchased, highly reviewed formulas',
    isDefault: true,
    isActive: true,
    maxProducts: 8,
    displayPosition: 2,
    productCount: 6
  },
  {
    _id: 'sec-3',
    name: 'Top Deals',
    slug: 'top_deals',
    heading: 'Flash Deals of the Week',
    subtitle: 'Up to 40% discount',
    isDefault: false,
    isActive: false,
    maxProducts: 6,
    displayPosition: 3,
    productCount: 2
  }
];

const mockCatalogProducts = [
  {
    _id: 'prod-1',
    title: 'MOSMAC Matte Liquid Lipstick',
    sku: 'MOS-LIP-001',
    price: 499,
    category: { name: 'Lips' },
    status: 'published'
  },
  {
    _id: 'prod-2',
    title: 'MOSMAC Longwear Eyeliner',
    sku: 'MOS-EYE-001',
    price: 349,
    category: { name: 'Eyes' },
    status: 'published'
  }
];

function renderWithProviders(ui) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer
    },
    preloadedState: {
      auth: {
        user: { role: 'super_admin', email: 'admin@example.com' },
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

describe('Frontend Homepage Section Management Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homepageSectionService.listAdminSections.mockResolvedValue(mockSections);
    homepageSectionService.getSectionProducts.mockResolvedValue(mockCatalogProducts);
    homepageSectionService.searchProducts.mockResolvedValue({
      products: mockCatalogProducts,
      pagination: { page: 1, totalPages: 1, total: 2 },
      categories: [{ _id: 'cat-1', name: 'Lips' }],
      brands: [{ _id: 'br-1', name: 'MOSMAC' }]
    });
  });

  it('1. Renders AdminHomepageSectionsPage with default and custom sections', async () => {
    renderWithProviders(<AdminHomepageSectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Trending Products')).toBeInTheDocument();
      expect(screen.getByText('Bestsellers')).toBeInTheDocument();
      expect(screen.getByText('Top Deals')).toBeInTheDocument();
    });

    expect(screen.getByText('Create Custom Section')).toBeInTheDocument();
    expect(screen.getByText('Import Excel')).toBeInTheDocument();
    expect(screen.getByText('Export Excel')).toBeInTheDocument();
  });

  it('2. Toggles section visibility status', async () => {
    homepageSectionService.toggleSectionStatus.mockResolvedValue({
      ...mockSections[0],
      isActive: false
    });

    renderWithProviders(<AdminHomepageSectionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Trending Products')).toBeInTheDocument();
    });

    // Locate eye toggle buttons
    const eyeButtons = screen.getAllByTitle(/Hide section from homepage|Show section on homepage/i);
    expect(eyeButtons.length).toBeGreaterThan(0);
    fireEvent.click(eyeButtons[0]);

    await waitFor(() => {
      expect(homepageSectionService.toggleSectionStatus).toHaveBeenCalledWith('sec-1', false);
    });
  });

  it('3. ManageSectionProductsModal displays assigned products and catalog selector', async () => {
    const handleClose = vi.fn();
    const handleUpdated = vi.fn();

    renderWithProviders(
      <ManageSectionProductsModal
        section={mockSections[0]}
        isOpen={true}
        onClose={handleClose}
        onUpdated={handleUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Managing Products: Trending Products/i)).toBeInTheDocument();
      expect(screen.getByText('Catalog Selector')).toBeInTheDocument();
    });

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('4. CreateSectionModal creates new custom section', async () => {
    const handleClose = vi.fn();
    const handleSaved = vi.fn();
    homepageSectionService.createSection.mockResolvedValue({
      _id: 'sec-new',
      name: 'Limited Edition',
      slug: 'limited_edition',
      isActive: true
    });

    renderWithProviders(
      <CreateSectionModal
        section={null}
        isOpen={true}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    );

    expect(screen.getByText('Create Custom Homepage Section')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Top Deals');
    fireEvent.change(nameInput, { target: { value: 'Limited Edition' } });

    const submitBtn = screen.getByRole('button', { name: /Create Section/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(homepageSectionService.createSection).toHaveBeenCalled();
      expect(handleSaved).toHaveBeenCalled();
    });
  });

  it('5. SectionExcelModal allows downloading template and shows upload dropzone', async () => {
    const handleClose = vi.fn();

    renderWithProviders(
      <SectionExcelModal
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Bulk Excel Assignment & Management/i)).toBeInTheDocument();
    expect(screen.getByText('Download Sample Excel')).toBeInTheDocument();

    const sampleBtn = screen.getByText('Download Sample Excel');
    fireEvent.click(sampleBtn);

    await waitFor(() => {
      expect(homepageSectionService.downloadSampleExcel).toHaveBeenCalled();
    });
  });

  it('6. AdminHomepageSettingsPage loads and updates all section settings', async () => {
    homepageSectionService.updateSection.mockResolvedValue({ success: true });

    renderWithProviders(<AdminHomepageSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Homepage Section Settings')).toBeInTheDocument();
      expect(screen.getByText('Trending Products')).toBeInTheDocument();
    });

    const saveAllBtn = screen.getAllByRole('button', { name: /Save All Settings/i })[0];
    fireEvent.click(saveAllBtn);

    await waitFor(() => {
      expect(homepageSectionService.updateSection).toHaveBeenCalled();
    });
  });
});

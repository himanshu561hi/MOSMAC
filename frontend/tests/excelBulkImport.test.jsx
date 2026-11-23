import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkImportModal } from '../src/components/admin/BulkImportModal';
import { BulkActionButtons } from '../src/components/admin/BulkActionButtons';
import { bulkImportService } from '../src/services/bulkImportService';

// Mock bulkImportService
vi.mock('../src/services/bulkImportService', () => ({
  bulkImportService: {
    downloadTemplate: vi.fn().mockResolvedValue(),
    validateUpload: vi.fn(),
    executeImport: vi.fn(),
    getJobStatus: vi.fn().mockResolvedValue(null),
    exportModule: vi.fn().mockResolvedValue(),
    downloadReport: vi.fn().mockResolvedValue()
  }
}));

describe('Phase 10A — Frontend Bulk Import & Export Components Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. BulkImportModal Component Lifecycle & Steps', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <BulkImportModal
          isOpen={false}
          onClose={() => {}}
          module="products"
          moduleTitle="Products"
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders Step 1 with template download options and file upload dropzone', () => {
      render(
        <BulkImportModal
          isOpen={true}
          onClose={() => {}}
          module="products"
          moduleTitle="Products & Catalogue"
        />
      );

      expect(screen.getByText(/Bulk Excel Import: Products & Catalogue/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Sample Excel/i)).toBeInTheDocument();
      expect(screen.getByText(/Download Blank Template/i)).toBeInTheDocument();
      expect(screen.getByText(/Validate & Preview/i)).toBeInTheDocument();
    });

    it('triggers sample and blank template downloads', async () => {
      render(
        <BulkImportModal
          isOpen={true}
          onClose={() => {}}
          module="products"
          moduleTitle="Products"
        />
      );

      const sampleBtn = screen.getByText(/Download Sample Excel/i);
      fireEvent.click(sampleBtn);

      await waitFor(() => {
        expect(bulkImportService.downloadTemplate).toHaveBeenCalledWith('products', true);
      });

      const blankBtn = screen.getByText(/Download Blank Template/i);
      fireEvent.click(blankBtn);

      await waitFor(() => {
        expect(bulkImportService.downloadTemplate).toHaveBeenCalledWith('products', false);
      });
    });

    it('moves to Step 2 upon successful pre-import validation and displays metrics and errors', async () => {
      bulkImportService.validateUpload.mockResolvedValueOnce({
        jobId: 'job_test_123',
        totalRows: 5,
        validRows: 4,
        invalidRows: 1,
        newRows: 3,
        existingRows: 1,
        errors: [
          {
            row: 4,
            column: 'Selling Price (INR)',
            value: 'invalid',
            reason: 'Price must be a valid number',
            suggestion: 'e.g. 1999'
          }
        ],
        previewRows: [
          { _rowNumber: 2, _valid: true, title: 'Valid Product 1', description: 'desc' }
        ]
      });

      render(
        <BulkImportModal
          isOpen={true}
          onClose={() => {}}
          module="products"
          moduleTitle="Products"
        />
      );

      // Create a mock file
      const file = new File(['dummy xlsx content'], 'products.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Target hidden file input
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Click Validate & Preview
      const validateBtn = screen.getByText(/Validate & Preview/i);
      fireEvent.click(validateBtn);

      await waitFor(() => {
        expect(bulkImportService.validateUpload).toHaveBeenCalledWith('products', file);
      });

      // Verify Step 2 rendered
      await waitFor(() => {
        expect(screen.getByText(/Select Import Mode/i)).toBeInTheDocument();
        expect(screen.getByText(/Row Validation Errors \(1\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Price must be a valid number/i)).toBeInTheDocument();
      });
    });

    it('allows choosing import mode and executes import to Step 3', async () => {
      bulkImportService.validateUpload.mockResolvedValueOnce({
        jobId: 'job_exec_999',
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        newRows: 1,
        existingRows: 1,
        errors: [],
        previewRows: []
      });

      bulkImportService.executeImport.mockResolvedValueOnce({
        jobId: 'job_exec_999',
        totalRows: 2,
        createdCount: 1,
        updatedCount: 1,
        skippedCount: 0,
        summary: 'Execution completed: 1 created, 1 updated.'
      });

      const onSuccessMock = vi.fn();

      render(
        <BulkImportModal
          isOpen={true}
          onClose={() => {}}
          module="categories"
          moduleTitle="Categories"
          onSuccess={onSuccessMock}
        />
      );

      const file = new File(['dummy xlsx'], 'categories.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const fileInput = document.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByText(/Validate & Preview/i));

      await waitFor(() => {
        expect(screen.getByText(/Select Import Mode/i)).toBeInTheDocument();
      });

      // Choose 'Create + Update' mode
      const createUpdateRadio = screen.getByDisplayValue('create_update');
      fireEvent.click(createUpdateRadio);
      expect(createUpdateRadio.checked).toBe(true);

      // Confirm import
      const confirmBtn = screen.getByText(/Confirm & Import/i);
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(bulkImportService.executeImport).toHaveBeenCalledWith('categories', 'job_exec_999', 'create_update');
        expect(screen.getByText(/Import Execution Completed/i)).toBeInTheDocument();
        expect(onSuccessMock).toHaveBeenCalled();
      });

      // Verify download report button
      const reportBtn = screen.getByText(/Download Execution Report/i);
      fireEvent.click(reportBtn);
      expect(bulkImportService.downloadReport).toHaveBeenCalledWith('job_exec_999');
    });
  });

  describe('2. BulkActionButtons Component', () => {
    it('renders both Export Excel and Bulk Import for import-enabled modules', () => {
      render(
        <BulkActionButtons
          module="products"
          moduleTitle="Products"
          supportsImport={true}
          supportsExport={true}
        />
      );

      expect(screen.getByText(/Export Excel/i)).toBeInTheDocument();
      expect(screen.getByText(/Bulk Import/i)).toBeInTheDocument();
    });

    it('renders only Export Excel when supportsImport is false (e.g. Customers, Orders)', () => {
      render(
        <BulkActionButtons
          module="customers"
          moduleTitle="Customers"
          supportsImport={false}
          supportsExport={true}
        />
      );

      expect(screen.getByText(/Export Excel/i)).toBeInTheDocument();
      expect(screen.queryByText(/Bulk Import/i)).toBeNull();
    });

    it('calls exportModule when Export Excel is clicked', async () => {
      render(
        <BulkActionButtons
          module="brands"
          moduleTitle="Brands"
          supportsImport={true}
          supportsExport={true}
        />
      );

      const exportBtn = screen.getByText(/Export Excel/i);
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(bulkImportService.exportModule).toHaveBeenCalledWith('brands', {});
      });
    });
  });
});

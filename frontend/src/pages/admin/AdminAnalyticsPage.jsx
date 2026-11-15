import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  Percent,
  Boxes,
  Users,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { adminService, downloadCsv } from '@/services/adminService';

export function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('last_30_days');
  const [downloading, setDownloading] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleDownload = async (reportType, downloadFn, filenamePrefix) => {
    try {
      setDownloading(reportType);
      setSuccessMessage(null);
      const csv = await downloadFn();
      const dateStr = new Date().toISOString().split('T')[0];
      downloadCsv(csv, `${filenamePrefix}_${dateStr}.csv`);
      setSuccessMessage(`${reportType} exported successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert(`Failed to export ${reportType}: ` + (err.response?.data?.message || err.message));
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    {
      id: 'orders',
      title: 'Complete Orders Ledger Report',
      description: 'Comprehensive order-by-order breakdown including orderNumber, date, customer details, addresses, item counts, subtotal, discount, tax breakdown, and status.',
      icon: FileSpreadsheet,
      badge: 'Operational',
      action: () => adminService.exportOrdersReport({ period }),
      prefix: 'orders_report'
    },
    {
      id: 'tax',
      title: 'Tax & GST Breakdown Report',
      description: 'Tax audit report formatted for Indian GST compliance showing taxable subtotal, CGST (Intrastate), SGST (Intrastate), and IGST (Interstate) per invoice.',
      icon: Percent,
      badge: 'Finance / Tax',
      action: () => adminService.exportTaxReport({ period }),
      prefix: 'gst_tax_report'
    },
    {
      id: 'inventory',
      title: 'Inventory & Stock Valuation Report',
      description: 'Snapshot of all SKU variants, physical stock, reserved allocations, low-stock reorder thresholds, selling prices, cost prices, and valuation.',
      icon: Boxes,
      badge: 'Warehouse',
      action: () => adminService.exportInventoryCsv(),
      prefix: 'inventory_report'
    },
    {
      id: 'coupons',
      title: 'Promotions & Coupons Performance',
      description: 'Marketing campaign effectiveness report showing coupon codes, discount types, redemption counts, discount caps, and active validity dates.',
      icon: BarChart3,
      badge: 'Marketing',
      action: () => adminService.exportCouponsReport(),
      prefix: 'coupons_performance'
    },
    {
      id: 'customers',
      title: 'Sanitized Customer Directory',
      description: 'Export customer contact records, account verification states, and registration dates with complete sanitization (passwords & tokens omitted).',
      icon: Users,
      badge: 'CRM',
      action: () => adminService.exportCustomersCsv(),
      prefix: 'customers_report'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Reporting & Data Exports Center
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generate authoritative CSV data exports for accounting, taxation, inventory audits, and marketing analytics
          </p>
        </div>

        {/* Global Period Selector for Time-Series Reports */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-lg shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Date Range:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-xs font-medium border-0 focus:ring-0 text-gray-800 bg-transparent cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-gray-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <r.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 uppercase tracking-wider px-2 py-0.5 rounded">
                  {r.badge}
                </span>
              </div>
              <h2 className="text-sm font-bold text-gray-900">{r.title}</h2>
              <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                disabled={downloading === r.title}
                onClick={() => handleDownload(r.title, r.action, r.prefix)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading === r.title ? 'Generating CSV...' : 'Download CSV'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminAnalyticsPage;

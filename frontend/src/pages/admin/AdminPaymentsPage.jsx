import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  RotateCcw,
  Download,
  AlertTriangle,
  Search,
  CheckCircle,
  Clock,
  Ban,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminService, downloadCsv } from '@/services/adminService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'refunds'
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'payments') {
        const res = await adminService.getPayments({
          page,
          limit: 20,
          search: search.trim() || undefined,
          status: statusFilter || undefined
        });
        setPayments(res?.payments || []);
        setPagination(res?.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      } else {
        const res = await adminService.getRefunds({
          page,
          limit: 20,
          status: statusFilter || undefined
        });
        setRefunds(res?.refunds || []);
        setPagination(res?.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [activeTab, statusFilter]);

  const handleExportCsv = async () => {
    try {
      const csv = await adminService.exportPaymentsCsv({ status: statusFilter || undefined });
      downloadCsv(csv, `payments_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      alert('Failed to export payments ledger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Financial Operations & Payments Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit payment gateway captures, webhook reconciliation records, and customer refund transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BulkActionButtons
            module="payments"
            moduleTitle="Payments"
            supportsImport={false}
            supportsExport={true}
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('payments');
            setStatusFilter('');
          }}
          className={`pb-3 text-xs font-semibold px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Gateway Payments
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('refunds');
            setStatusFilter('');
          }}
          className={`pb-3 text-xs font-semibold px-2 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'refunds'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Refunds Ledger
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Content */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Transaction / Order</th>
                  <th className="px-4 py-3">Gateway</th>
                  <th className="px-4 py-3">Gateway Payment ID</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                      Loading payment transactions...
                    </td>
                  </tr>
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const orderNumber = p.orderNumber || p.orderId?.orderNumber || 'N/A';
                    return (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {p.orderId?._id ? (
                              <Link
                                to={`/admin/orders/${p.orderId._id}`}
                                className="text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                {orderNumber} <ArrowUpRight className="w-3 h-3" />
                              </Link>
                            ) : (
                              orderNumber
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400">Txn: {p._id}</div>
                        </td>
                        <td className="px-4 py-3 uppercase font-medium text-gray-700">
                          {p.gateway}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-600">
                          {p.gatewayPaymentId || p.gatewayOrderId || 'N/A'}
                        </td>
                        <td className="px-4 py-3 uppercase text-gray-600 text-[11px]">
                          {p.method || p.paymentMethod || 'UPI/Card'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              p.status === 'captured'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'authorized'
                                ? 'bg-blue-100 text-blue-800'
                                : p.status === 'refunded'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(p.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refunds Content */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Refund ID / Order</th>
                  <th className="px-4 py-3 text-right">Refund Amount</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Processed By</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      Loading refund records...
                    </td>
                  </tr>
                ) : refunds.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      No refund records logged.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => {
                    const orderNumber = r.orderNumber || r.orderId?.orderNumber || 'N/A';
                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{orderNumber}</div>
                          <div className="text-[11px] text-gray-400">ID: {r._id}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          {formatCurrency(r.amount)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {r.reason || 'Customer request'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              r.status === 'processed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-[11px]">
                          {r.processedBy?.firstName
                            ? `${r.processedBy.firstName} (${r.processedBy.role})`
                            : 'Staff Admin'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPaymentsPage;

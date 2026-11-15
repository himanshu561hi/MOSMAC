import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Code
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatDate } from '@/utils/formatters';

export function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Changes Inspector Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getAuditLogs({
        page,
        limit: 50,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
        search: search.trim() || undefined
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to query administrative audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [actionFilter, resourceFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Immutable Administrative Audit Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Strict append-only record of all critical staff actions, role updates, stock adjustments, and suspensions
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search notes or resource ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadLogs(1)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-emerald-500"
          >
            <option value="">All Actions</option>
            <option value="STAFF_CREATED">STAFF_CREATED</option>
            <option value="STAFF_ROLE_CHANGE">STAFF_ROLE_CHANGE</option>
            <option value="STAFF_SESSIONS_REVOKED">STAFF_SESSIONS_REVOKED</option>
            <option value="CUSTOMER_STATUS_UPDATE">CUSTOMER_STATUS_UPDATE</option>
            <option value="CUSTOMER_NOTE_ADDED">CUSTOMER_NOTE_ADDED</option>
            <option value="INVENTORY_ADJUSTMENT">INVENTORY_ADJUSTMENT</option>
            <option value="STOCK_THRESHOLD_UPDATE">STOCK_THRESHOLD_UPDATE</option>
          </select>

          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="text-xs rounded-lg border border-gray-300 py-1.5 px-3 focus:outline-none focus:ring-emerald-500"
          >
            <option value="">All Resource Types</option>
            <option value="User">User</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="Coupon">Coupon</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor (Staff)</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target Resource</th>
                <th className="px-4 py-3">Audit Summary / Notes</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400 font-sans text-xs">
                    Querying immutable audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400 font-sans text-xs">
                    No audit records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 font-sans">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{log.actorEmail || 'System'}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{log.actorRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-medium">{log.resourceType}</div>
                      <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">
                        {log.resourceId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">
                      {log.notes || 'No notes provided'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Code className="w-3 h-3" /> Diff
                        </button>
                      ) : (
                        <span className="text-gray-300 text-[10px]">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing {logs.length} of {pagination.total} audit entries (Page {pagination.page} of {pagination.pages})
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadLogs(pagination.page - 1)}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => loadLogs(pagination.page + 1)}
              className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Changes Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                Sanitized Audit Change Record
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <strong>Action:</strong> <span className="font-mono">{selectedLog.action}</span>
              </p>
              <p>
                <strong>Actor:</strong> {selectedLog.actorEmail} ({selectedLog.actorRole})
              </p>
              <p>
                <strong>Resource:</strong> {selectedLog.resourceType} ({selectedLog.resourceId})
              </p>
              <p>
                <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toISOString()}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Payload / Diff (Redacted & Sanitized):
              </label>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog.changes, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogsPage;

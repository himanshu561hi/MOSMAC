import React, { useEffect, useState } from 'react';
import {
  Tag,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  Calendar,
  IndianRupee,
  Percent,
  Search,
  Trash2,
  Clock
} from 'lucide-react';
import { adminService, downloadCsv } from '@/services/adminService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  // Create Coupon Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: '',
    minOrderAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalUsageLimit: '',
    usageLimitPerUser: 1,
    isActive: true
  });
  const [createLoading, setCreateLoading] = useState(false);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getCoupons({ search: search.trim() || undefined });
      setCoupons(res.coupons || res || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleExportCsv = async () => {
    try {
      const csv = await adminService.exportCouponsReport();
      downloadCsv(csv, `coupons_report_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      alert('Failed to export coupons CSV');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateLoading(true);
      const payload = {
        code: createData.code.trim().toUpperCase(),
        description: createData.description.trim(),
        discountType: createData.discountType,
        discountValue: Number(createData.discountValue),
        minOrderAmount: createData.minOrderAmount ? Math.round(Number(createData.minOrderAmount) * 100) : 0,
        maxDiscountAmount: createData.maxDiscountAmount ? Math.round(Number(createData.maxDiscountAmount) * 100) : null,
        startDate: new Date(createData.startDate),
        endDate: new Date(createData.endDate),
        totalUsageLimit: createData.totalUsageLimit ? Number(createData.totalUsageLimit) : null,
        usageLimitPerUser: Number(createData.usageLimitPerUser) || 1,
        isActive: createData.isActive
      };

      await adminService.createCoupon(payload);
      setShowCreateModal(false);
      setCreateData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscountAmount: '',
        minOrderAmount: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalUsageLimit: '',
        usageLimitPerUser: 1,
        isActive: true
      });
      loadCoupons();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await adminService.updateCoupon(coupon._id, { isActive: !coupon.isActive });
      loadCoupons();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle coupon status');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon ${code}?`)) return;
    try {
      await adminService.deleteCoupon(id);
      loadCoupons();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-600" />
            Promotions & Coupon Codes
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure discount rules, cart thresholds, redemption caps, and validity windows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="coupons"
            moduleTitle="Coupons"
            onSuccess={loadCoupons}
          />
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-gray-200">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Code & Info</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Conditions</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-4 py-3">Validity Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    Loading promotional coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                    No active coupons found. Click "Create Coupon" to launch a campaign.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const isExpired = new Date(c.endDate) < new Date();
                  return (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {c.code}
                        </span>
                        {c.description && (
                          <p className="text-[11px] text-gray-500 mt-1 max-w-xs truncate">
                            {c.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-700">
                          {c.discountType === 'percentage'
                            ? `${c.discountValue}% OFF`
                            : `${formatCurrency(c.discountValue)} OFF`}
                        </span>
                        {c.maxDiscountAmount && (
                          <div className="text-[11px] text-gray-400">
                            Cap: {formatCurrency(c.maxDiscountAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>Min Cart: {formatCurrency(c.minOrderAmount || 0)}</div>
                        <div className="text-[11px] text-gray-400">Max {c.usageLimitPerUser || 1}/user</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {c.usedCount || 0} / {c.totalUsageLimit || '∞'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-[11px]">
                        <div>From: {formatDate(c.startDate)}</div>
                        <div>To: {formatDate(c.endDate)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer transition-colors ${
                            c.isActive && !isExpired
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isExpired ? 'Expired' : c.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id, c.code)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                Create Promotional Coupon
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FESTIVE20"
                    value={createData.code}
                    onChange={(e) => setCreateData({ ...createData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold uppercase rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={createData.discountType}
                    onChange={(e) => setCreateData({ ...createData, discountType: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (Paise)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Discount Value {createData.discountType === 'percentage' ? '(%)' : '(in Paise, e.g. 50000 for ₹500)'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={createData.discountValue}
                  onChange={(e) => setCreateData({ ...createData, discountValue: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Min Cart Subtotal (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 999"
                    value={createData.minOrderAmount}
                    onChange={(e) => setCreateData({ ...createData, minOrderAmount: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500 (optional)"
                    value={createData.maxDiscountAmount}
                    onChange={(e) => setCreateData({ ...createData, maxDiscountAmount: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={createData.startDate}
                    onChange={(e) => setCreateData({ ...createData, startDate: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={createData.endDate}
                    onChange={(e) => setCreateData({ ...createData, endDate: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Total Limit</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={createData.totalUsageLimit}
                    onChange={(e) => setCreateData({ ...createData, totalUsageLimit: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Limit Per User</label>
                  <input
                    type="number"
                    min="1"
                    value={createData.usageLimitPerUser}
                    onChange={(e) => setCreateData({ ...createData, usageLimitPerUser: e.target.value })}
                    className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 10% off on all lighting products"
                  value={createData.description}
                  onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                  className="w-full text-xs rounded-lg border border-gray-300 p-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  {createLoading ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCouponsPage;

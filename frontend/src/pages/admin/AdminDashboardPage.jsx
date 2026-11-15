import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  RotateCcw,
  Boxes,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  CreditCard,
  Ban
} from 'lucide-react';
import { fetchDashboardOverview, setFilterPeriod } from '@/store/slices/adminSlice';
import { formatCurrency, formatDate } from '@/utils/formatters';

const PERIOD_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom Range', value: 'custom' }
];

export function AdminDashboardPage() {
  const dispatch = useDispatch();
  const { overview } = useSelector((state) => state.admin);
  const { data, loading, error, period } = overview;

  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  useEffect(() => {
    if (period !== 'custom') {
      dispatch(fetchDashboardOverview({ period }));
    }
  }, [dispatch, period]);

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === 'custom') {
      setShowCustomModal(true);
    } else {
      dispatch(setFilterPeriod(newPeriod));
    }
  };

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    dispatch(fetchDashboardOverview({ period: 'custom', startDate: customStart, endDate: customEnd }));
    dispatch(setFilterPeriod('custom'));
    setShowCustomModal(false);
  };

  const kpi = data?.kpi || {
    gmv: 0,
    grossRevenue: 0,
    refunds: 0,
    netRevenue: 0,
    aov: 0,
    totalOrders: 0,
    capturedOrders: 0,
    growth: { gmv: 0, revenue: 0, orders: 0 }
  };

  const customers = data?.customers || { total: 0, new: 0, returning: 0 };
  const orders = data?.orders || { byStatus: {}, byPaymentMethod: {} };
  const inventory = data?.inventory || {
    totalSkus: 0,
    totalStockUnits: 0,
    reservedUnits: 0,
    lowStockSkus: 0,
    outOfStockSkus: 0,
    valuation: 0
  };
  const timeline = data?.timeline || [];
  const topProducts = data?.topSellingProducts || [];

  return (
    <div className="space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Executive Operations Overview</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time business performance derived directly from database ledger
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 p-1 rounded-lg overflow-x-auto shadow-sm">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handlePeriodChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                period === opt.value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Select Custom Date Range
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleApplyCustomDate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Apply Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Net Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(kpi.netRevenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {kpi.growth.revenue >= 0 ? (
                <span className="flex items-center text-emerald-600 font-medium">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />+{kpi.growth.revenue}%
                </span>
              ) : (
                <span className="flex items-center text-red-600 font-medium">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />{kpi.growth.revenue}%
                </span>
              )}
              <span className="text-gray-400">vs prior period</span>
            </div>
          </div>
        </div>

        {/* GMV */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Gross Merchandise Value (GMV)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(kpi.gmv)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="text-gray-500 font-medium">
                Gross: {formatCurrency(kpi.grossRevenue)}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-red-500">Refunds: {formatCurrency(kpi.refunds)}</span>
            </div>
          </div>
        </div>

        {/* Total Orders & AOV */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Orders & AOV</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : kpi.totalOrders.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <span>Avg Order: <strong className="text-gray-900">{formatCurrency(kpi.aov)}</strong></span>
              <span className="text-gray-300">•</span>
              <span>{kpi.capturedOrders} Captured</span>
            </div>
          </div>
        </div>

        {/* Customer Base */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Customers Base</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '...' : customers.total.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="text-emerald-600 font-medium">+{customers.new} New</span>
              <span className="text-gray-300">•</span>
              <span className="text-blue-600 font-medium">{customers.returning} Returning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders Status & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Order Pipeline Status</h2>
            <Link to="/admin/orders" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
              <span className="text-blue-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Placed / Pending
              </span>
              <span className="font-bold text-blue-900">{orders.byStatus?.pending || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <span className="text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
              </span>
              <span className="font-bold text-emerald-900">{orders.byStatus?.confirmed || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between">
              <span className="text-amber-700 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> Processing
              </span>
              <span className="font-bold text-amber-900">{orders.byStatus?.processing || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between">
              <span className="text-indigo-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Shipped
              </span>
              <span className="font-bold text-indigo-900">{orders.byStatus?.shipped || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-between">
              <span className="text-teal-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
              </span>
              <span className="font-bold text-teal-900">{orders.byStatus?.delivered || 0}</span>
            </div>

            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center justify-between">
              <span className="text-red-700 flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5" /> Cancelled
              </span>
              <span className="font-bold text-red-900">{orders.byStatus?.cancelled || 0}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Payment Breakdown</h2>
            <Link to="/admin/payments" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Ledger <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Razorpay (Prepaid / UPI)</p>
                  <p className="text-[11px] text-gray-500">
                    {orders.byPaymentMethod?.razorpay?.count || 0} orders
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">
                  {formatCurrency(orders.byPaymentMethod?.razorpay?.totalAmount || 0)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Cash on Delivery (COD)</p>
                  <p className="text-[11px] text-gray-500">
                    {orders.byPaymentMethod?.cod?.count || 0} orders
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-900">
                  {formatCurrency(orders.byPaymentMethod?.cod?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Valuation & Alerts */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Stock & Valuation</h2>
            <Link to="/admin/inventory" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              Replenish <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-gray-500">Inventory Valuation:</span>
              <span className="font-bold text-gray-900">{formatCurrency(inventory.valuation)}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-gray-500">Total SKUs in Catalogue:</span>
              <span className="font-bold text-gray-900">{inventory.totalSkus}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-gray-500">Physical Stock Units:</span>
              <span className="font-bold text-gray-900">
                {inventory.totalStockUnits} (Reserved: {inventory.reservedUnits})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-100">
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Low Stock SKUs:
              </span>
              <span className="font-bold text-amber-700">{inventory.lowStockSkus}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-red-600 font-medium">Out of Stock SKUs:</span>
              <span className="font-bold text-red-700">{inventory.outOfStockSkus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline & Top Products Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Table / Visualization */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Revenue & Orders Activity</h2>
            <span className="text-xs text-gray-500">Daily aggregates in selected period</span>
          </div>

          {timeline.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No order activity recorded in this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Orders</th>
                    <th className="pb-2 text-right">Revenue (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {timeline.map((row) => (
                    <tr key={row.date} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-gray-900">{row.date}</td>
                      <td className="py-2.5 text-right text-gray-600">{row.orders}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-700">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Top Selling Products</h2>
            <span className="text-xs text-gray-500">By Revenue</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No product sales in this period</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, idx) => (
                <div key={p._id || idx} className="flex items-center justify-between text-xs py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-gray-900 truncate">{p.title}</p>
                      <p className="text-[11px] text-gray-400">SKU: {p._id} • {p.totalQuantity} units</p>
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 shrink-0 ml-2">
                    {formatCurrency(p.totalRevenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;

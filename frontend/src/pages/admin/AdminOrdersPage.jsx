import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  ArrowRight,
  User,
  MapPin,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Loader2,
  FileText,
  PackageCheck
} from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { fetchAdminOrders, updateAdminOrderStatus } from '@/store/slices/orderSlice';
import { BulkActionButtons } from '@/components/admin/BulkActionButtons';
import OrderDocumentModal from '@/components/orders/OrderDocumentModal';

const PIPELINE_STAGES = [
  {
    key: 'placed_pending',
    statuses: ['placed', 'pending'],
    label: 'Placed & Pending',
    subtitle: 'New incoming orders',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'bg-gradient-to-r from-blue-50 to-blue-100/60 text-blue-900 border-blue-200',
    columnBg: 'bg-blue-50/20 border-blue-100',
    accentColor: 'text-blue-600',
    icon: Clock,
    nextStatus: 'confirmed',
    nextLabel: 'Confirm Order',
    nextIcon: CheckCircle2,
    btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
  },
  {
    key: 'confirmed',
    statuses: ['confirmed'],
    label: 'Confirmed',
    subtitle: 'Ready to pack',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBg: 'bg-gradient-to-r from-indigo-50 to-indigo-100/60 text-indigo-900 border-indigo-200',
    columnBg: 'bg-indigo-50/20 border-indigo-100',
    accentColor: 'text-indigo-600',
    icon: CheckCircle2,
    nextStatus: 'processing',
    nextLabel: 'Start Packing',
    nextIcon: ShoppingBag,
    btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  },
  {
    key: 'processing',
    statuses: ['processing'],
    label: 'Packaging',
    subtitle: 'Being packed & boxed',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-900 border-amber-200',
    columnBg: 'bg-amber-50/20 border-amber-100',
    accentColor: 'text-amber-600',
    icon: ShoppingBag,
    nextStatus: 'shipped',
    nextLabel: 'Dispatch / Ship',
    nextIcon: Truck,
    btnColor: 'bg-amber-600 hover:bg-amber-700 text-white'
  },
  {
    key: 'shipped',
    statuses: ['shipped'],
    label: 'Shipped',
    subtitle: 'In courier transit',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    headerBg: 'bg-gradient-to-r from-purple-50 to-purple-100/60 text-purple-900 border-purple-200',
    columnBg: 'bg-purple-50/20 border-purple-100',
    accentColor: 'text-purple-600',
    icon: Truck,
    nextStatus: 'out_for_delivery',
    nextLabel: 'Out for Delivery',
    nextIcon: Truck,
    btnColor: 'bg-purple-600 hover:bg-purple-700 text-white'
  },
  {
    key: 'out_for_delivery',
    statuses: ['out_for_delivery'],
    label: 'Out for Delivery',
    subtitle: 'With delivery rider',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    headerBg: 'bg-gradient-to-r from-cyan-50 to-cyan-100/60 text-cyan-900 border-cyan-200',
    columnBg: 'bg-cyan-50/20 border-cyan-100',
    accentColor: 'text-cyan-600',
    icon: Truck,
    nextStatus: 'delivered',
    nextLabel: 'Mark Delivered',
    nextIcon: CheckCircle2,
    btnColor: 'bg-cyan-700 hover:bg-cyan-800 text-white'
  },
  {
    key: 'delivered',
    statuses: ['delivered'],
    label: 'Delivered',
    subtitle: 'Successfully completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBg: 'bg-gradient-to-r from-emerald-50 to-emerald-100/60 text-emerald-900 border-emerald-200',
    columnBg: 'bg-emerald-50/20 border-emerald-100',
    accentColor: 'text-emerald-600',
    icon: CheckCircle2,
    nextStatus: null,
    nextLabel: null
  },
  {
    key: 'cancelled',
    statuses: ['cancelled'],
    label: 'Cancelled',
    subtitle: 'Void / Refunded',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    headerBg: 'bg-gradient-to-r from-rose-50 to-rose-100/60 text-rose-900 border-rose-200',
    columnBg: 'bg-rose-50/20 border-rose-100',
    accentColor: 'text-rose-600',
    icon: XCircle,
    nextStatus: null,
    nextLabel: null
  }
];

export function AdminOrdersPage() {
  const dispatch = useDispatch();
  const { adminOrders, adminTotal, adminPage, adminTotalPages, adminLoading, adminError } =
    useSelector((state) => state.orders);

  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'table'
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [transitioningOrderId, setTransitioningOrderId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedDocOrder, setSelectedDocOrder] = useState(null);
  const [docType, setDocType] = useState('invoice');

  const loadOrders = (page = 1) => {
    dispatch(
      fetchAdminOrders({
        page,
        limit: viewMode === 'pipeline' ? 100 : 15,
        search: search.trim() || undefined,
        orderStatus: orderStatus || undefined,
        paymentStatus: paymentStatus || undefined
      })
    );
  };

  useEffect(() => {
    loadOrders(currentPage);
  }, [dispatch, currentPage, orderStatus, paymentStatus, viewMode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadOrders(1);
  };

  const handleQuickStatus = async (orderId, nextStatus, nextLabel) => {
    if (!orderId || !nextStatus) return;
    setTransitioningOrderId(orderId);
    setActionSuccessMessage('');
    try {
      await dispatch(
        updateAdminOrderStatus({
          id: orderId,
          orderStatus: nextStatus,
          note: `Quick pipeline transition: ${nextLabel}`
        })
      ).unwrap();
      setActionSuccessMessage(`Order updated to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionSuccessMessage(''), 3000);
    } catch (err) {
      alert(`Failed to transition order: ${err || 'Action rejected by server'}`);
    } finally {
      setTransitioningOrderId(null);
    }
  };

  // Group orders by pipeline stage
  const pipelineGroups = useMemo(() => {
    const groups = {};
    PIPELINE_STAGES.forEach((stage) => {
      groups[stage.key] = {
        ...stage,
        orders: [],
        totalValue: 0
      };
    });

    const ordersList = Array.isArray(adminOrders) ? adminOrders : [];

    ordersList.forEach((ord) => {
      const status = ord.orderStatus || 'placed';
      const targetStage = PIPELINE_STAGES.find((s) => s.statuses.includes(status)) || PIPELINE_STAGES[0];
      if (groups[targetStage.key]) {
        groups[targetStage.key].orders.push(ord);
        groups[targetStage.key].totalValue += (ord.grandTotal || 0);
      }
    });

    return groups;
  }, [adminOrders]);

  // Overall KPI statistics
  const summaryKpis = useMemo(() => {
    const ordersList = Array.isArray(adminOrders) ? adminOrders : [];
    const totalCount = adminTotal || ordersList.length;
    const totalRevenue = ordersList.reduce((acc, o) => acc + (o.grandTotal || 0), 0);
    const activeCount = ordersList.filter((o) =>
      ['placed', 'pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'].includes(o.orderStatus)
    ).length;
    const deliveredCount = ordersList.filter((o) => o.orderStatus === 'delivered').length;

    return {
      totalCount,
      totalRevenue,
      activeCount,
      deliveredCount
    };
  }, [adminOrders, adminTotal]);

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <Clock className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            <ShoppingBag className="w-3 h-3" /> Processing
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Truck className="w-3 h-3" /> Shipped
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
            <Truck className="w-3 h-3" /> Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
            {status}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'captured':
        return (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Payment Pending
          </span>
        );
      case 'refunded':
      case 'partially_refunded':
        return (
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            {status === 'partially_refunded' ? 'Partial Refund' : 'Refunded'}
          </span>
        );
      case 'failed':
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Orders & Fulfilment Pipeline</h1>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-500" /> Live Tracker
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track order lifecycle from placement through packaging, courier dispatch, and final delivery.
          </p>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table View
            </button>
          </div>

          <BulkActionButtons
            module="orders"
            moduleTitle="Orders"
            supportsImport={false}
            supportsExport={true}
          />

          <button
            type="button"
            onClick={() => loadOrders(currentPage)}
            title="Refresh Orders"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-xl font-black text-slate-900 mt-1">{summaryKpis.totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Active In Pipeline</p>
          <p className="text-xl font-black text-amber-700 mt-1">{summaryKpis.activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Delivered</p>
          <p className="text-xl font-black text-emerald-700 mt-1">{summaryKpis.deliveredCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Orders Value</p>
          <p className="text-xl font-black text-slate-900 mt-1">{formatCurrency(summaryKpis.totalRevenue)}</p>
        </div>
      </div>

      {/* Status banner */}
      {actionSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search order #, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Filter
          </Button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
          {viewMode === 'table' && (
            <>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Fulfilment:</span>
              </div>
              <select
                value={orderStatus}
                onChange={(e) => {
                  setOrderStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </>
          )}

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Payment:</span>
          </div>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="">All Payments</option>
            <option value="captured">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {adminLoading && (!adminOrders || adminOrders.length === 0) ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <LoadingSpinner size="lg" />
          <p className="text-xs font-semibold text-slate-500">Loading order pipeline...</p>
        </div>
      ) : adminError ? (
        <div className="p-8 text-center text-sm text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          {adminError}
        </div>
      ) : viewMode === 'pipeline' ? (
        /* KANBAN / PIPELINE BOARD VIEW */
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-200">
            {PIPELINE_STAGES.map((stage) => {
              const group = pipelineGroups[stage.key] || { orders: [], totalValue: 0 };
              const StageIcon = stage.icon;

              return (
                <div
                  key={stage.key}
                  className={`w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl border shadow-2xs overflow-hidden ${stage.columnBg}`}
                >
                  {/* Column Header */}
                  <div className={`p-3.5 border-b flex items-center justify-between ${stage.headerBg}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white/80 shadow-2xs flex items-center justify-center">
                        <StageIcon className={`w-4 h-4 ${stage.accentColor}`} />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold tracking-tight">{stage.label}</h3>
                        <p className="text-[10px] text-slate-500">{stage.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 text-xs font-black rounded-full border ${stage.badgeClass}`}>
                        {group.orders.length}
                      </span>
                      {group.totalValue > 0 && (
                        <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                          {formatCurrency(group.totalValue)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Orders Cards Stack */}
                  <div className="p-3 space-y-3 flex-1 min-h-[420px] max-h-[calc(100vh-320px)] overflow-y-auto">
                    {group.orders.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-200 bg-white/50 text-slate-400">
                        <StageIcon className="w-5 h-5 mb-1.5 opacity-40" />
                        <p className="text-xs font-medium">No orders in this stage</p>
                      </div>
                    ) : (
                      group.orders.map((ord) => {
                        const isTransitioning = transitioningOrderId === ord._id;
                        const customerName =
                          ord.shippingAddress?.fullName ||
                          `${ord.customer?.firstName || ''} ${ord.customer?.lastName || ''}`.trim() ||
                          'Guest Customer';
                        const customerCity = ord.shippingAddress?.city;
                        const contact =
                          ord.shippingAddress?.phone ||
                          ord.customer?.email ||
                          ord.customerSnapshot?.email ||
                          ord.shippingAddress?.email;

                        return (
                          <div
                            key={ord._id}
                            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-md transition-all space-y-3 group"
                          >
                            {/* Card Top: Order Number & Date */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {ord.orderNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {formatDate(ord.createdAt)}
                              </span>
                            </div>

                            {/* Customer & Address snippet */}
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{customerName}</span>
                              </div>
                              {customerCity && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{customerCity}</span>
                                </div>
                              )}
                              {contact && (
                                <p className="text-[10px] text-slate-400 truncate pl-5">
                                  {contact}
                                </p>
                              )}
                            </div>

                            {/* Items count & Grand Total */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                <Package className="w-3 h-3 text-slate-400" />
                                {ord.items?.length || 0} item{(ord.items?.length || 0) !== 1 ? 's' : ''}
                              </span>
                              <span className="font-extrabold text-slate-900 text-sm">
                                {formatCurrency(ord.grandTotal)}
                              </span>
                            </div>

                            {/* Payment badges */}
                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <div className="flex items-center gap-1">
                                {getPaymentStatusBadge(ord.paymentStatus)}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {ord.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {ord.orderStatus}
                              </span>
                            </div>

                            {/* Card Actions: Transition Next Stage & View */}
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                              {stage.nextStatus && stage.nextLabel && (
                                <button
                                  type="button"
                                  disabled={isTransitioning}
                                  onClick={() => handleQuickStatus(ord._id, stage.nextStatus, stage.nextLabel)}
                                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 ${stage.btnColor}`}
                                >
                                  {isTransitioning ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <span>{stage.nextLabel}</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocOrder(ord);
                                    setDocType('invoice');
                                    setDocModalOpen(true);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors border border-emerald-200"
                                  title="Print GST Tax Invoice"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDocOrder(ord);
                                    setDocType('packing_slip');
                                    setDocModalOpen(true);
                                  }}
                                  className="inline-flex items-center justify-center p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors border border-blue-200"
                                  title="Print Packing Slip & Proof"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" />
                                </button>
                                <Link
                                  to={`/admin/orders/${ord._id}`}
                                  className="inline-flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                                  title="Full Order Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {adminOrders && adminOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {adminOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {ord.shippingAddress?.fullName || `${ord.customer?.firstName || ''} ${ord.customer?.lastName || ''}`.trim() || 'Guest'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {ord.customer?.email || ord.customerSnapshot?.email || ord.shippingAddress?.email || ord.shippingAddress?.phone}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(ord.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        {ord.items?.length || 0} items
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(ord.grandTotal)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {getPaymentStatusBadge(ord.paymentStatus)}
                          <p className="text-[10px] text-slate-400 capitalize">
                            {ord.paymentMethod === 'cod' ? 'COD' : 'Razorpay'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getOrderStatusBadge(ord.orderStatus)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocOrder(ord);
                              setDocType('invoice');
                              setDocModalOpen(true);
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                            title="Print GST Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDocOrder(ord);
                              setDocType('packing_slip');
                              setDocModalOpen(true);
                            }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                            title="Print Packing Slip & Proof"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                          </button>
                          <Link to={`/admin/orders/${ord._id}`}>
                            <Button variant="secondary" size="xs" className="flex items-center gap-1 inline-flex">
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>Manage</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs">
              No orders found matching your filters.
            </div>
          )}

          {/* Pagination Footer */}
          {adminTotalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <span>
                Page {adminPage} of {adminTotalPages} ({adminTotal} total orders)
              </span>
              <Pagination
                totalPages={adminTotalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {/* GST Tax Invoice & Packing Slip Modal */}
      <OrderDocumentModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        order={selectedDocOrder}
        initialDocType={docType}
      />
    </div>
  );
}

export default AdminOrdersPage;

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  MapPin,
  FileText,
  AlertTriangle,
  Clock,
  Plus,
  Send,
  ShieldCheck,
  CheckCircle,
  Ban
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { formatCurrency, formatDate } from '@/utils/formatters';

export function AdminCustomerDetailPage() {
  const { id } = useParams();
  const customerId = id || 'cust-101';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Note form state
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getCustomerProfile(customerId);
      setProfile(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [customerId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      setNoteLoading(true);
      setNoteSuccess(false);
      const updatedNotes = await adminService.addCustomerNote(customerId, noteContent.trim());
      setProfile((prev) => ({ ...prev, staffNotes: updatedNotes }));
      setNoteContent('');
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add staff note');
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-gray-400">
        Loading customer detailed profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <Link to="/admin/customers" className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers
        </Link>
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error || 'Customer profile not found'}</span>
        </div>
      </div>
    );
  }

  const { customer, addresses = [], recentOrders = [], metrics = {}, staffNotes = [] } = profile;
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Anonymous';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Customers List
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              {fullName}
            </h1>
            <p className="text-xs text-gray-500">Customer ID: {customer._id}</p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                customer.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {customer.status}
            </span>
            {customer.isEmailVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <ShieldCheck className="w-3 h-3" /> Email Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Spend Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Lifetime Spend</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {formatCurrency(metrics.totalSpent || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Orders Placed</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {metrics.totalOrders || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Average Order Value</span>
            <IndianRupee className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900 mt-2">
            {formatCurrency(metrics.aov || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Registration Date</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm font-semibold text-gray-900 mt-2">
            {formatDate(customer.createdAt)}
          </div>
        </div>
      </div>

      {/* Main Grid: Orders & Addresses on Left, Notes on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Contact, Addresses, Recent Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{customer.phone || 'No phone recorded'}</span>
              </div>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Saved Addresses ({addresses.length})
            </h2>

            {addresses.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No saved addresses on file.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((a, idx) => (
                  <div key={a._id || idx} className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{a.fullName}</span>
                      {a.isDefaultShipping && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{a.addressLine1}</p>
                    {a.addressLine2 && <p className="text-gray-600">{a.addressLine2}</p>}
                    <p className="text-gray-500">
                      {a.city}, {a.state} - {a.postalCode}
                    </p>
                    <p className="text-gray-400 text-[11px]">Phone: {a.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Recent Orders ({recentOrders.length})
              </h2>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-gray-400 py-3">No orders found for this customer.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-gray-200">
                  <thead className="text-gray-500 font-medium">
                    <tr>
                      <th className="py-2">Order #</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Items</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-gray-50">
                        <td className="py-2 font-semibold text-gray-900">
                          <Link to={`/admin/orders/${o._id}`} className="text-emerald-600 hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-500">{formatDate(o.createdAt)}</td>
                        <td className="py-2 text-gray-600">{o.items?.length || 0}</td>
                        <td className="py-2">
                          <span className="capitalize font-medium text-gray-700">
                            {o.orderStatus}
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-gray-900">
                          {formatCurrency(o.pricing?.grandTotal || o.grandTotal || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Staff Internal Notes Timeline & Form */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-600" />
              Staff Notes (Internal Only)
            </h2>
            <p className="text-[11px] text-gray-400">
              Administrative notes regarding customer inquiries, return exceptions, or VIP requests. Immutable and audit-logged.
            </p>

            {/* Note Input Form */}
            <form onSubmit={handleAddNote} className="space-y-2.5">
              <textarea
                rows="3"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter an internal note..."
                required
                className="w-full text-xs rounded-lg border border-gray-300 p-2.5 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <div className="flex items-center justify-between">
                {noteSuccess && (
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Note saved!
                  </span>
                )}
                {!noteSuccess && <div />}
                <button
                  type="submit"
                  disabled={noteLoading || !noteContent.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  {noteLoading ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>

            {/* Notes Timeline */}
            <div className="border-t border-gray-100 pt-3 space-y-3">
              {staffNotes.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">No notes added yet.</p>
              ) : (
                staffNotes.map((n, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs space-y-1">
                    <p className="text-gray-800 whitespace-pre-wrap">{n.note}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1">
                      <span>By: {n.authorName || 'Staff'}</span>
                      <span>{formatDate(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCustomerDetailPage;

import React, { useState, useEffect } from 'react';
import { reviewService } from '../../services/reviewService';
import { BulkActionButtons } from '../../components/admin/BulkActionButtons';
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Search,
  Filter,
  MessageSquare
} from 'lucide-react';

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [ratingFilter, setRatingFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetReview, setTargetReview] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (ratingFilter !== 'all') params.rating = ratingFilter;
      if (search) params.search = search;

      const res = await reviewService.listAdminReviews(params);
      setReviews(res.reviews);
    } catch (err) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter, ratingFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadReviews();
  };

  const handleApprove = async (id) => {
    try {
      setActionLoading(id);
      await reviewService.moderateReview(id, 'approved', 'Meets community and verification guidelines');
      setSuccessMsg('Review approved and aggregate product rating updated');
      await loadReviews();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to approve review');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (review) => {
    setTargetReview(review);
    setRejectReason('Does not meet customer review guidelines');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!targetReview) return;
    try {
      setActionLoading(targetReview._id);
      await reviewService.moderateReview(targetReview._id, 'rejected', rejectReason);
      setSuccessMsg('Review rejected');
      setRejectModalOpen(false);
      await loadReviews();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reject review');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently? This will re-aggregate the product rating score.')) return;
    try {
      setActionLoading(id);
      await reviewService.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r._id !== id));
      setSuccessMsg('Review deleted permanently');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete review');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            Verified Customer Reviews & Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Moderate genuine reviews from customers with delivered orders. Approved reviews dynamically calculate PDP star averages.
          </p>
        </div>
        <BulkActionButtons
          module="reviews"
          moduleTitle="Reviews"
          supportsImport={false}
          supportsExport={true}
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'pending', label: 'Pending Moderation Queue' },
          { key: 'approved', label: 'Approved (Public)' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all', label: 'All Reviews' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`py-2.5 px-4 font-medium text-sm border-b-2 transition -mb-px ${
              statusFilter === tab.key
                ? 'border-yellow-500 text-yellow-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Rating Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews by title, comment, SKU, or customer name..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">5 Stars Only</option>
            <option value="4">4 Stars Only</option>
            <option value="3">3 Stars Only</option>
            <option value="2">2 Stars Only</option>
            <option value="1">1 Star Only</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
          <span className="ml-3 text-sm text-gray-500">Loading reviews...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Reviews In This View</h3>
          <p className="text-sm text-gray-500 mt-1">There are currently no reviews matching your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div
              key={rev._id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  {/* Star Rating Display */}
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <span className="text-sm font-bold text-amber-900">{rev.rating}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Purchaser
                    </span>
                  )}

                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded uppercase ${
                      rev.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rev.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    {rev.status}
                  </span>
                </div>

                <span className="text-xs text-gray-400">
                  Submitted {new Date(rev.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Review Title & Body */}
              <div>
                <h4 className="font-semibold text-gray-900 text-base">{rev.title}</h4>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line leading-relaxed">
                  {rev.comment}
                </p>
              </div>

              {/* Associated Customer & Order Details */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-50">
                <span>By: <strong className="text-gray-800">{rev.customerName}</strong></span>
                <span>Product SKU: <strong className="text-gray-800 font-mono">{rev.sku}</strong></span>
                {rev.orderNumber && (
                  <span>Order: <strong className="text-gray-800 font-mono">#{rev.orderNumber}</strong></span>
                )}
                {rev.moderationNote && (
                  <span className="text-rose-600 font-medium">Note: {rev.moderationNote}</span>
                )}
              </div>

              {/* Moderation Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {rev.status !== 'approved' && (
                  <button
                    onClick={() => handleApprove(rev._id)}
                    disabled={actionLoading === rev._id}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
                  </button>
                )}

                {rev.status !== 'rejected' && (
                  <button
                    onClick={() => openRejectModal(rev)}
                    disabled={actionLoading === rev._id}
                    className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium hover:bg-rose-100 transition disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </button>
                )}

                <button
                  onClick={() => handleDelete(rev._id)}
                  disabled={actionLoading === rev._id}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition"
                  title="Delete Review Permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Reject Review</h3>
            <p className="text-xs text-gray-500">
              Please document the reason for rejecting this review. The review will be excluded from product rating calculations.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moderation Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Inappropriate language, off-topic complaint, or invalid claims."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === targetReview._id}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === targetReview._id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReviewsPage;

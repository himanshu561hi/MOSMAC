import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { BulkActionButtons } from '../../components/admin/BulkActionButtons';
import {
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

const COMMON_CATEGORIES = [
  'Orders & Tracking',
  'Shipping & Delivery',
  'Payments & Invoicing',
  'Returns & Refunds',
  'Products & Sizing',
  'Account & Security'
];

export function AdminFaqsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'Orders & Tracking',
    displayOrder: 1,
    isActive: true
  });

  const loadFaqs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (search) params.search = search;
      const data = await cmsService.listAdminFaqs(params);
      setFaqs(data);
    } catch (err) {
      setError(err.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadFaqs();
  };

  const openCreateModal = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      category: selectedCategory !== 'all' ? selectedCategory : 'Orders & Tracking',
      displayOrder: faqs.length + 1,
      isActive: true
    });
    setModalOpen(true);
  };

  const openEditModal = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'Orders & Tracking',
      displayOrder: faq.displayOrder || 1,
      isActive: faq.isActive
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        question: formData.question,
        answer: formData.answer,
        category: formData.category,
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive
      };

      if (editingFaq) {
        await cmsService.updateFaq(editingFaq._id, payload);
        setSuccessMsg('FAQ updated successfully');
      } else {
        await cmsService.createFaq(payload);
        setSuccessMsg('New FAQ created');
      }

      setModalOpen(false);
      await loadFaqs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save FAQ');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (faq) => {
    try {
      await cmsService.updateFaq(faq._id, { isActive: !faq.isActive });
      setFaqs((prev) =>
        prev.map((f) => (f._id === faq._id ? { ...f, isActive: !f.isActive } : f))
      );
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this FAQ item?')) return;
    try {
      await cmsService.deleteFaq(id);
      setFaqs((prev) => prev.filter((f) => f._id !== id));
      setSuccessMsg('FAQ deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete FAQ');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            Frequently Asked Questions (FAQ)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build and organize categorized questions answered for customer reassurance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="faqs"
            moduleTitle="FAQs"
            onSuccess={loadFaqs}
          />
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs by question or answer keyword..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {COMMON_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Alerts */}
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

      {/* FAQs List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-sm text-gray-500">Loading FAQs...</span>
        </div>
      ) : faqs.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No FAQs Found</h3>
          <p className="text-sm text-gray-500 mt-1">Add common customer questions to populate the public help centre.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 shadow-sm overflow-hidden">
          {faqs.map((faq) => (
            <div
              key={faq._id}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                !faq.isActive ? 'bg-gray-50 opacity-75' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {faq.category}
                  </span>
                  <span className="text-xs text-gray-400">Order #{faq.displayOrder}</span>
                  {!faq.isActive && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                      Hidden
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900">{faq.question}</h3>
                <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                <button
                  onClick={() => handleToggle(faq)}
                  className={`p-2 rounded-lg border transition ${
                    faq.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title={faq.isActive ? 'Visible to customers' : 'Hidden from customers'}
                >
                  {faq.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEditModal(faq)}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                  title="Edit FAQ"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(faq._id)}
                  className="p-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                  title="Delete FAQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingFaq ? 'Edit FAQ Item' : 'Add FAQ Item'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
                <input
                  type="text"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g. How do I track my order once it ships?"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="e.g. As soon as your parcel is dispatched, you will receive an SMS and email with live courier tracking."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="faqActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="faqActive" className="text-sm font-medium text-gray-700">
                  Visible on Storefront (Active)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingFaq ? 'Save Changes' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFaqsPage;

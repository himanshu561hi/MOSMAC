import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import { BulkActionButtons } from '../../components/admin/BulkActionButtons';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  History,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

export function AdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    seoTitle: '',
    seoDescription: '',
    status: 'published',
    changeSummary: ''
  });

  const loadPages = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await cmsService.listAdminPages();
      setPages(res.pages);
    } catch (err) {
      setError(err.message || 'Failed to load content pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const openCreateModal = () => {
    setEditingPage(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      seoTitle: '',
      seoDescription: '',
      status: 'published',
      changeSummary: ''
    });
    setModalOpen(true);
  };

  const openEditModal = (page) => {
    setEditingPage(page);
    setFormData({
      title: page.title || '',
      slug: page.slug || '',
      content: page.content || '',
      seoTitle: page.seoTitle || '',
      seoDescription: page.seoDescription || '',
      status: page.status || 'published',
      changeSummary: ''
    });
    setModalOpen(true);
  };

  const openRevisionsModal = (page) => {
    setSelectedPage(page);
    setRevisionsModalOpen(true);
  };

  const handleTitleChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: !editingPage
        ? val
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
        : prev.slug
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        title: formData.title,
        content: formData.content,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
        status: formData.status,
        changeSummary: formData.changeSummary || 'Updated content via Admin CMS'
      };

      if (editingPage) {
        await cmsService.updatePage(editingPage._id, payload);
        setSuccessMsg('Page updated successfully');
      } else {
        payload.slug = formData.slug;
        await cmsService.createPage(payload);
        setSuccessMsg('New content page published');
      }

      setModalOpen(false);
      await loadPages();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this content page? Customers viewing this URL will receive a 404.')) return;
    try {
      await cmsService.deletePage(id);
      setPages((prev) => prev.filter((p) => p._id !== id));
      setSuccessMsg('Page deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete page');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-600" />
            Content Pages & Legal Policies
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish brand stories, customer service documentation, and legal disclosures with full revision tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BulkActionButtons
            module="cms-pages"
            moduleTitle="Content Pages"
            onSuccess={loadPages}
          />
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Page
          </button>
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

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="ml-3 text-sm text-gray-500">Loading pages...</span>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Content Pages Yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create pages such as About Us, Return Policy, and FAQs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Title & Description</th>
                <th className="py-3.5 px-4">Slug & URL</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Revisions</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((page) => (
                <tr key={page._id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-gray-900">{page.title}</div>
                    {page.seoDescription && (
                      <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{page.seoDescription}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-gray-600">
                    <a
                      href={`/pages/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      /pages/{page.slug}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        page.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => openRevisionsModal(page)}
                      className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-medium"
                    >
                      <History className="w-3.5 h-3.5" />
                      {page.revisions?.length || 0} revisions
                    </button>
                  </td>
                  <td className="py-4 px-4 text-xs text-gray-500">
                    {new Date(page.updatedAt || page.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(page)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                      title="Edit Page"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(page._id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Delete Page"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Page Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPage ? 'Edit Content Page' : 'Create Content Page'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Page Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Return & Refund Policy"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPage}
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. return-policy"
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Publishing Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="published">Published (Publicly Viewable)</option>
                  <option value="draft">Draft (Restricted to Staff)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rich Content (HTML) *</label>
                <textarea
                  rows={8}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="<h2>Policy Overview</h2><p>Items may be returned within 7 days of delivery...</p>"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Scripts and unsafe attributes are automatically sanitized on save to preserve XSS immunity.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    placeholder="e.g. Return Policy | Store Name"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Change Summary (Revision Note)</label>
                  <input
                    type="text"
                    value={formData.changeSummary}
                    onChange={(e) => setFormData({ ...formData, changeSummary: e.target.value })}
                    placeholder="e.g. Updated standard shipping cutoff timeline"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPage ? 'Save Changes' : 'Publish Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {revisionsModalOpen && selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Revision History</h3>
                <p className="text-xs text-gray-500">"{selectedPage.title}" ({selectedPage.slug})</p>
              </div>
              <button onClick={() => setRevisionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {selectedPage.revisions?.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No prior revisions recorded for this page.</p>
            ) : (
              <div className="space-y-3">
                {selectedPage.revisions.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg border text-sm space-y-1">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="font-semibold text-gray-800">
                        {rev.changeSummary || 'Content modified'}
                      </span>
                      <span>{new Date(rev.updatedAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border max-h-24 overflow-y-auto">
                      {rev.content.slice(0, 300)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPagesPage;

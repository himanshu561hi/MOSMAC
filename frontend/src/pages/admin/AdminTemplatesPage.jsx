import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../../services/cmsService';
import {
  Mail,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Code,
  ArrowLeft
} from 'lucide-react';

export function AdminTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    subject: '',
    bodyHtml: '',
    isActive: true
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.listTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err.message || 'Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setFormData({
      subject: template.subject || '',
      bodyHtml: template.bodyHtml || '',
      isActive: template.isActive ?? true
    });
    setEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingTemplate) return;
    try {
      setSaving(true);
      setError(null);
      await cmsService.updateTemplate(editingTemplate._id, formData);
      setSuccessMsg('Notification template updated successfully');
      setEditModalOpen(false);
      await loadTemplates();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = async (template) => {
    try {
      setPreviewLoading(true);
      setEditingTemplate(template);
      setPreviewModalOpen(true);

      const sampleVariables = {
        storeName: 'AURORA Premium',
        customerName: 'Aditya Roy',
        orderNumber: 'ORD-20261114-8849',
        grandTotal: '₹2,499',
        paymentMethod: 'UPI / Razorpay',
        estimatedDelivery: '3 to 5 business days',
        courierName: 'BlueDart Express',
        trackingNumber: 'BLUEDART-88291039',
        trackingUrl: 'https://bluedart.com/track',
        resetUrl: 'https://aurorastore.in/reset-password?token=sample_token',
        verificationUrl: 'https://aurorastore.in/verify-email?token=sample_token',
        amount: '₹2,499',
        refundAmount: '₹2,499'
      };

      const res = await cmsService.previewTemplate(template.type, sampleVariables);
      setPreviewData(res);
    } catch (err) {
      setError(err.message || 'Failed to render preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back to CMS Hub button */}
      <div>
        <Link
          to="/admin/cms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-emerald-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to CMS Hub
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-rose-600" />
            Transactional Notification Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Maintain customer milestone emails, order confirmations, and dispatch notifications with safe variable injection.
          </p>
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

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
          <span className="ml-3 text-sm text-gray-500">Loading templates...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200 shadow-sm overflow-hidden">
          {templates.map((template) => (
            <div key={template._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                    {template.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {template.supportedVariables?.length || 0} variables supported
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <span className="font-medium text-gray-500">Subject:</span>
                  <span className="font-mono text-xs text-gray-800">{template.subject}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => openPreview(template)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  <Eye className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  Live Preview
                </button>
                <button
                  onClick={() => openEditModal(template)}
                  className="inline-flex items-center px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg hover:bg-rose-100 transition"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Edit Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Template: {editingTemplate.name}</h3>
                <span className="text-xs font-mono text-gray-400">{editingTemplate.type}</span>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supported Dynamic Placeholders</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-lg border text-xs">
                  {editingTemplate.supportedVariables?.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-rose-700 font-mono font-medium"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HTML Message Body *</label>
                <textarea
                  rows={8}
                  required
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData({ ...formData, bodyHtml: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Rendered Template Preview</h3>
              <button onClick={() => setPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {previewLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Subject:</span>
                  <div className="font-semibold text-gray-900 mt-0.5">{previewData.renderedSubject || previewData.subject}</div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">HTML Body Output:</span>
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: previewData.renderedBody || previewData.bodyHtml }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTemplatesPage;

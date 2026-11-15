import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import {
  Compass,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoveUp,
  MoveDown,
  Columns
} from 'lucide-react';

export function AdminNavigationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerLinks, setHeaderLinks] = useState([]);
  const [footerCols, setFooterCols] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await cmsService.getAdminSettings();
      setHeaderLinks(settings.headerNavigation || []);
      setFooterCols(settings.footerColumns || []);
    } catch (err) {
      setError(err.message || 'Failed to load navigation configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Header Nav Helpers
  const addHeaderLink = () => {
    setHeaderLinks([
      ...headerLinks,
      { label: 'New Link', link: '/products', order: headerLinks.length + 1, isCategoryDropdown: false }
    ]);
  };

  const updateHeaderLink = (index, field, value) => {
    const updated = [...headerLinks];
    updated[index] = { ...updated[index], [field]: value };
    setHeaderLinks(updated);
  };

  const removeHeaderLink = (index) => {
    setHeaderLinks(headerLinks.filter((_, idx) => idx !== index));
  };

  // Footer Column Helpers
  const addFooterCol = () => {
    setFooterCols([
      ...footerCols,
      { title: 'New Column', links: [{ label: 'Link 1', link: '/products' }] }
    ]);
  };

  const updateFooterColTitle = (colIdx, title) => {
    const updated = [...footerCols];
    updated[colIdx] = { ...updated[colIdx], title };
    setFooterCols(updated);
  };

  const removeFooterCol = (colIdx) => {
    setFooterCols(footerCols.filter((_, idx) => idx !== colIdx));
  };

  const addFooterLink = (colIdx) => {
    const updated = [...footerCols];
    updated[colIdx].links = [...(updated[colIdx].links || []), { label: 'New Link', link: '/' }];
    setFooterCols(updated);
  };

  const updateFooterLink = (colIdx, linkIdx, field, value) => {
    const updated = [...footerCols];
    updated[colIdx].links[linkIdx] = {
      ...updated[colIdx].links[linkIdx],
      [field]: value
    };
    setFooterCols(updated);
  };

  const removeFooterLink = (colIdx, linkIdx) => {
    const updated = [...footerCols];
    updated[colIdx].links = updated[colIdx].links.filter((_, idx) => idx !== linkIdx);
    setFooterCols(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      await cmsService.updateAdminSettings({
        headerNavigation: headerLinks,
        footerColumns: footerCols
      });
      setSuccessMsg('Navigation settings saved successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save navigation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-purple-600" />
            Navigation & Menus
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure storefront top header links, category dropdown menus, and multi-column footer navigation.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Navigation
        </button>
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

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-sm text-gray-500">Loading navigation menus...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1. Header Navigation Links */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Header Navigation Menu</h3>
                <p className="text-xs text-gray-500">Links shown in the top navigation bar of the customer storefront.</p>
              </div>
              <button
                onClick={addHeaderLink}
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Link
              </button>
            </div>

            <div className="space-y-3">
              {headerLinks.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="text-xs font-mono font-bold text-gray-400 w-6">#{idx + 1}</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateHeaderLink(idx, 'label', e.target.value)}
                    placeholder="Link Label (e.g. Products)"
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    value={item.link}
                    onChange={(e) => updateHeaderLink(idx, 'link', e.target.value)}
                    placeholder="URL Path (e.g. /products)"
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center text-xs text-gray-600 gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.isCategoryDropdown}
                        onChange={(e) => updateHeaderLink(idx, 'isCategoryDropdown', e.target.checked)}
                        className="rounded text-purple-600 border-gray-300"
                      />
                      <span>Category Dropdown</span>
                    </label>
                    <button
                      onClick={() => removeHeaderLink(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Footer Columns */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Columns className="w-5 h-5 text-gray-500" />
                  Footer Columns & Links
                </h3>
                <p className="text-xs text-gray-500">Multi-column links displayed in the footer across all storefront pages.</p>
              </div>
              <button
                onClick={addFooterCol}
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Column
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {footerCols.map((col, colIdx) => (
                <div key={colIdx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => updateFooterColTitle(colIdx, e.target.value)}
                      placeholder="Column Title"
                      className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:outline-none focus:border-purple-600 px-1 py-0.5"
                    />
                    <button
                      onClick={() => removeFooterCol(colIdx)}
                      className="p-1 text-gray-400 hover:text-rose-600 transition"
                      title="Remove Column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {col.links?.map((link, linkIdx) => (
                      <div key={linkIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateFooterLink(colIdx, linkIdx, 'label', e.target.value)}
                          placeholder="Label"
                          className="w-1/2 px-2 py-1 text-xs border rounded bg-white"
                        />
                        <input
                          type="text"
                          value={link.link}
                          onChange={(e) => updateFooterLink(colIdx, linkIdx, 'link', e.target.value)}
                          placeholder="/path"
                          className="w-1/2 px-2 py-1 text-xs border rounded bg-white font-mono"
                        />
                        <button
                          onClick={() => removeFooterLink(colIdx, linkIdx)}
                          className="text-gray-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addFooterLink(colIdx)}
                    className="w-full py-1 text-center text-xs text-purple-700 font-medium bg-white border border-dashed border-purple-200 rounded hover:bg-purple-50 transition"
                  >
                    + Add Link
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNavigationPage;

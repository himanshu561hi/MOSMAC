import React, { useState, useEffect } from 'react';
import { cmsService } from '../../services/cmsService';
import {
  FolderOpen,
  Upload,
  Search,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

export function AdminMediaLibraryPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folderFilter, setFolderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Manual URL recording form (or signed upload simulation)
  const [newAsset, setNewAsset] = useState({
    publicId: '',
    url: '',
    altText: '',
    folder: 'ecommerce/banners',
    width: 1200,
    height: 600
  });

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (folderFilter !== 'all') params.folder = folderFilter;
      if (search) params.search = search;
      const res = await cmsService.listMediaAssets(params);
      setAssets(res.assets);
    } catch (err) {
      setError(err.message || 'Failed to load media assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [folderFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadAssets();
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRecordAsset = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      await cmsService.recordMediaAsset({
        publicId: newAsset.publicId,
        url: newAsset.url,
        secureUrl: newAsset.url,
        altText: newAsset.altText || 'Media Asset',
        folder: newAsset.folder,
        width: Number(newAsset.width) || 800,
        height: Number(newAsset.height) || 800,
        format: 'jpg',
        bytes: 150000
      });
      setSuccessMsg('Media asset recorded in registry');
      setUploadModalOpen(false);
      setNewAsset({
        publicId: '',
        url: '',
        altText: '',
        folder: 'ecommerce/banners',
        width: 1200,
        height: 600
      });
      await loadAssets();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to record asset');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, force = false) => {
    if (!window.confirm('Are you sure you want to delete this media asset?')) return;
    try {
      setActionLoading(true);
      setError(null);
      await cmsService.deleteMediaAsset(id, force);
      setAssets((prev) => prev.filter((a) => a._id !== id));
      setSuccessMsg('Media asset deleted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete asset');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-cyan-600" />
            Media Asset Library & Cloudinary Registry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse hosted campaign imagery and copy secure URLs with built-in reference protection against accidental deletions.
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition shadow-sm"
        >
          <Upload className="w-4 h-4 mr-2" />
          Add Media Asset
        </button>
      </div>

      {/* Search & Folder Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets by public ID, alt text, or filename..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </form>
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="all">All Asset Folders</option>
          <option value="ecommerce/banners">Banners & Heroes</option>
          <option value="ecommerce/products">Product Photography</option>
          <option value="ecommerce/general">Brand & General</option>
        </select>
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

      {/* Assets Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <span className="ml-3 text-sm text-gray-500">Loading media library...</span>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Media Assets Found</h3>
          <p className="text-sm text-gray-500 mt-1">Record or upload imagery to store in your media repository.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <div
              key={asset._id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between group hover:shadow-md transition"
            >
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={asset.url}
                  alt={asset.altText || asset.publicId}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/400x400?text=Image+Unavailable';
                  }}
                />
                <span className="absolute bottom-1.5 left-1.5 text-[10px] uppercase font-mono px-1.5 py-0.5 bg-black/60 text-white rounded">
                  {asset.format || 'jpg'} • {asset.width}x{asset.height}
                </span>
              </div>

              <div className="p-3 space-y-2">
                <p className="text-xs font-mono text-gray-700 truncate" title={asset.publicId}>
                  {asset.publicId}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleCopy(asset.url, asset._id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 hover:text-cyan-800"
                    title="Copy Image URL to Clipboard"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === asset._id ? 'Copied!' : 'Copy URL'}
                  </button>

                  <button
                    onClick={() => handleDelete(asset._id)}
                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Record Asset Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add Media Asset to Registry</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleRecordAsset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Public ID *</label>
                <input
                  type="text"
                  required
                  value={newAsset.publicId}
                  onChange={(e) => setNewAsset({ ...newAsset, publicId: e.target.value })}
                  placeholder="e.g. ecommerce/banners/summer_festival"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
                <input
                  type="url"
                  required
                  value={newAsset.url}
                  onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../banner.jpg"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text / Description</label>
                <input
                  type="text"
                  value={newAsset.altText}
                  onChange={(e) => setNewAsset({ ...newAsset, altText: e.target.value })}
                  placeholder="e.g. Summer sale banner on beach backdrop"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Category</label>
                <select
                  value={newAsset.folder}
                  onChange={(e) => setNewAsset({ ...newAsset, folder: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="ecommerce/banners">ecommerce/banners</option>
                  <option value="ecommerce/products">ecommerce/products</option>
                  <option value="ecommerce/general">ecommerce/general</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Record Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMediaLibraryPage;

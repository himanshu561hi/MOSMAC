import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homepageSectionService } from '@/services/homepageSectionService';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Alert from '@/components/common/Alert';
import {
  Settings,
  ArrowLeft,
  Save,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';

export function AdminHomepageSettingsPage() {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSections = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await homepageSectionService.listAdminSections();
      setSections(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load section settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const handleChange = (id, field, value) => {
    setSections((prev) =>
      prev.map((s) => (s._id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Update each section in parallel
      await Promise.all(
        sections.map((s) =>
          homepageSectionService.updateSection(s._id, {
            name: s.name,
            heading: s.heading || s.name,
            subtitle: s.subtitle,
            description: s.description,
            maxProducts: parseInt(s.maxProducts, 10) || 8,
            displayPosition: parseInt(s.displayPosition, 10) || 1,
            showViewAll: s.showViewAll !== false,
            viewAllLink: s.viewAllLink || '/products',
            isActive: Boolean(s.isActive)
          })
        )
      );

      setSuccessMessage('All section settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save all settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link to="/admin/homepage-sections" className="hover:text-gray-900 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" /> Homepage Sections
            </Link>
            <span>/</span>
            <span className="font-semibold text-gray-900">Settings</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-emerald-600" /> Homepage Section Settings
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tune storefront headings, subtitles, maximum product limits, and CTA destination links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/homepage-sections">
            <Button variant="outline" size="sm" className="text-xs gap-1">
              Back to Sections
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            isLoading={isSaving}
            disabled={isSaving || isLoading || sections.length === 0}
            className="text-xs gap-1.5"
          >
            <Save className="w-4 h-4" /> Save All Settings
          </Button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <Alert variant="success" className="text-xs font-medium">
          {successMessage}
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="error" className="text-xs font-medium">
          {errorMessage}
        </Alert>
      )}

      {/* Main Table */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-gray-200">
              <thead className="bg-gray-50 text-gray-700 font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Pos</th>
                  <th className="py-3 px-4 w-48">Section</th>
                  <th className="py-3 px-4 min-w-[200px]">Storefront Heading</th>
                  <th className="py-3 px-4 min-w-[220px]">Subtitle</th>
                  <th className="py-3 px-4 w-24 text-center">Max Prods</th>
                  <th className="py-3 px-4 min-w-[160px]">View All URL</th>
                  <th className="py-3 px-4 w-28 text-center">Show "View All"</th>
                  <th className="py-3 px-4 w-24 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sections.map((sec) => (
                  <tr key={sec._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Position */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        value={sec.displayPosition || 1}
                        onChange={(e) => handleChange(sec._id, 'displayPosition', e.target.value)}
                        className="w-12 px-1.5 py-1 text-center font-bold text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </td>

                    {/* Section Name & Slug */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 truncate">{sec.name}</p>
                      <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                        slug: {sec.slug}
                      </span>
                    </td>

                    {/* Heading */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={sec.heading || ''}
                        placeholder={sec.name}
                        onChange={(e) => handleChange(sec._id, 'heading', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </td>

                    {/* Subtitle */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={sec.subtitle || ''}
                        placeholder="Subtitle description..."
                        onChange={(e) => handleChange(sec._id, 'subtitle', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </td>

                    {/* Max Products */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={sec.maxProducts || 8}
                        onChange={(e) => handleChange(sec._id, 'maxProducts', e.target.value)}
                        className="w-16 px-2 py-1 text-center text-xs font-semibold border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </td>

                    {/* View All URL */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={sec.viewAllLink || ''}
                        placeholder="/products"
                        onChange={(e) => handleChange(sec._id, 'viewAllLink', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </td>

                    {/* Show View All Toggle */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={sec.showViewAll !== false}
                        onChange={(e) => handleChange(sec._id, 'showViewAll', e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleChange(sec._id, 'isActive', !sec.isActive)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase transition-colors ${
                          sec.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {sec.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Total Managed Sections: <strong>{sections.length}</strong>
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAll}
              isLoading={isSaving}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" /> Save All Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminHomepageSettingsPage;

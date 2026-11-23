import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homepageSectionService } from '@/services/homepageSectionService';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Alert from '@/components/common/Alert';
import {
  Layers,
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  Settings,
  Edit2,
  Trash2,
  Package,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Sparkles,
  TrendingUp,
  Award,
  Heart,
  Flame,
  CheckCircle2,
  ExternalLink,
  Tag,
  Crown
} from 'lucide-react';
import ManageSectionProductsModal from '@/components/admin/homepage/ManageSectionProductsModal';
import CreateSectionModal from '@/components/admin/homepage/CreateSectionModal';
import SectionExcelModal from '@/components/admin/homepage/SectionExcelModal';

export function AdminHomepageSectionsPage() {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modals state
  const [activeManageSection, setActiveManageSection] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const fetchSections = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await homepageSectionService.listAdminSections();
      setSections(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load homepage sections');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // Status toggle handler
  const handleToggleStatus = async (section) => {
    try {
      const updated = await homepageSectionService.toggleSectionStatus(section._id, !section.isActive);
      setSections((prev) =>
        prev.map((s) => (s._id === section._id ? { ...s, isActive: updated.isActive } : s))
      );
      setSuccessMessage(`Updated status for "${section.name}"`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update section status');
    }
  };

  // Reorder up / down handler
  const handleMovePosition = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const copy = [...sections];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reorderedPayload = copy.map((s, idx) => ({
      id: s._id,
      displayPosition: idx + 1
    }));

    // Optimistic update
    setSections(copy.map((s, idx) => ({ ...s, displayPosition: idx + 1 })));

    try {
      await homepageSectionService.reorderSections(reorderedPayload);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save section reordering');
      fetchSections(); // Rollback
    }
  };

  // Delete section handler
  const handleDeleteSection = async (section) => {
    if (section.isDefault) {
      alert('System default sections cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete custom section "${section.name}"? Assigned product associations will also be removed.`)) {
      return;
    }

    try {
      await homepageSectionService.deleteSection(section._id);
      setSections((prev) => prev.filter((s) => s._id !== section._id));
      setSuccessMessage(`Section "${section.name}" deleted successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete section');
    }
  };

  // Export Excel handler
  const handleExportExcel = async () => {
    try {
      await homepageSectionService.exportAssignmentsExcel();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to export assignments');
    }
  };

  // Download Sample Excel handler
  const handleDownloadSample = async () => {
    try {
      await homepageSectionService.downloadSampleExcel();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to download sample template');
    }
  };

  const getSectionIcon = (slug) => {
    switch (slug) {
      case 'trending':
        return <TrendingUp className="w-5 h-5 text-rose-500" />;
      case 'bestsellers':
        return <Award className="w-5 h-5 text-amber-500" />;
      case 'most_loved':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'featured':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'whats_new':
        return <Flame className="w-5 h-5 text-orange-500" />;
      case 'offers_deals':
        return <Tag className="w-5 h-5 text-red-500" />;
      case 'mosmac_select':
        return <Crown className="w-5 h-5 text-indigo-500" />;
      default:
        return <Layers className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="font-semibold text-gray-900">Homepage Management</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-emerald-600" /> Homepage Section Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Curate dynamic homepage product showcases, reorder positions, and control visibility.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/homepage-sections/settings">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Section Settings
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSample}
            className="text-xs gap-1.5"
            title="Download sample Excel template"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" /> Sample Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcelModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" /> Import Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs gap-1.5"
            title="Export all section-product assignments"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingSection(null);
              setIsCreateModalOpen(true);
            }}
            className="text-xs gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Custom Section
          </Button>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Main Content: Section Cards List */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-gray-400">Loading homepage sections...</p>
        </div>
      ) : sections.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
          <Layers className="w-16 h-16 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-900">No sections found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Get started by initializing default sections or creating a custom homepage showcase.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create First Section
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const productCount = section.productCount || 0;

            return (
              <div
                key={section._id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-xs ${
                  section.isActive
                    ? 'border-gray-200/80 hover:border-emerald-300'
                    : 'border-dashed border-gray-300 bg-gray-50/50 opacity-75'
                }`}
              >
                {/* Left: Position & Section Info */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Position Badge with Up/Down Controls */}
                  <div className="flex flex-col items-center justify-center bg-slate-100 rounded-xl p-1 w-11 flex-shrink-0 border border-slate-200">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMovePosition(index, 'up')}
                      className="p-0.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-20 transition-colors"
                      title="Move section up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold font-mono text-gray-800">
                      #{section.displayPosition || index + 1}
                    </span>
                    <button
                      disabled={index === sections.length - 1}
                      onClick={() => handleMovePosition(index, 'down')}
                      className="p-0.5 rounded text-gray-500 hover:text-gray-900 disabled:opacity-20 transition-colors"
                      title="Move section down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0 shadow-xs">
                    {getSectionIcon(section.slug)}
                  </div>

                  {/* Information */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                        {section.name}
                      </h3>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {section.slug}
                      </span>

                      {section.isDefault ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          System Default
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Custom Section
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          section.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {section.isActive ? 'Active on Storefront' : 'Hidden'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {section.heading ? `"${section.heading}"` : section.description}
                      {section.subtitle && <span className="text-gray-400"> — {section.subtitle}</span>}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span>Max visible: <strong className="text-gray-700">{section.maxProducts || 8}</strong></span>
                      <span>•</span>
                      <span>Type: <strong className="text-gray-700 capitalize">{section.type?.replace('_', ' ') || 'Product Grid'}</strong></span>
                      {section.viewAllLink && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-gray-500 truncate max-w-[150px]">{section.viewAllLink}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Products Count Badge & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Assigned count pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold">
                    <Package className="w-4 h-4 text-slate-500" />
                    <span>{productCount} products</span>
                  </div>

                  {/* Manage Products CTA */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveManageSection(section)}
                    className="text-xs gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" /> Manage Products
                  </Button>

                  {/* Toggle Active status */}
                  <button
                    onClick={() => handleToggleStatus(section)}
                    title={section.isActive ? 'Hide section from homepage' : 'Show section on homepage'}
                    className={`p-2 rounded-lg border transition-colors ${
                      section.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {section.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Edit Section Settings */}
                  <button
                    onClick={() => {
                      setEditingSection(section);
                      setIsCreateModalOpen(true);
                    }}
                    title="Edit section details"
                    className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete (only for custom sections) */}
                  {!section.isDefault && (
                    <button
                      onClick={() => handleDeleteSection(section)}
                      title="Delete custom section"
                      className="p-2 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {activeManageSection && (
        <ManageSectionProductsModal
          section={activeManageSection}
          isOpen={Boolean(activeManageSection)}
          onClose={() => setActiveManageSection(null)}
          onUpdated={fetchSections}
        />
      )}

      {isCreateModalOpen && (
        <CreateSectionModal
          section={editingSection}
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingSection(null);
          }}
          onSaved={fetchSections}
        />
      )}

      {isExcelModalOpen && (
        <SectionExcelModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImportCompleted={fetchSections}
        />
      )}
    </div>
  );
}

export default AdminHomepageSectionsPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cmsService } from '../../services/cmsService';
import {
  Settings,
  Store,
  Truck,
  Banknote,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft
} from 'lucide-react';

export function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [settings, setSettings] = useState({
    storeName: 'AURORA',
    tagline: 'Modern General E-Commerce Store',
    logoUrl: '',
    faviconUrl: '',
    contactEmail: 'support@aurora.in',
    contactPhone: '+91 98765 43210',
    supportHours: 'Mon - Sat: 9:00 AM - 7:00 PM IST',
    address: {
      street: '402, Trade Hub, BKC',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      country: 'India'
    },
    currency: 'INR',
    taxGst: {
      gstin: '27AAAAA0000A1Z5',
      defaultRate: 18
    },
    shipping: {
      flatRate: 49, // converted to ₹ for admin form
      freeShippingThreshold: 999
    },
    cod: {
      enabled: true,
      minOrderValue: 200,
      maxOrderValue: 10000
    },
    maintenanceMode: {
      enabled: false,
      message: 'Our store is undergoing scheduled maintenance. We will be back shortly.'
    }
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cmsService.getAdminSettings();
      setSettings({
        storeName: data.storeName || 'AURORA',
        tagline: data.tagline || '',
        logoUrl: data.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        supportHours: data.supportHours || '',
        address: data.address || { street: '', city: '', state: '', postalCode: '', country: 'India' },
        currency: data.currency || 'INR',
        taxGst: data.taxGst || { gstin: '', defaultRate: 18 },
        shipping: {
          flatRate: Math.round((data.shipping?.flatRate || 4900) / 100),
          freeShippingThreshold: Math.round((data.shipping?.freeShippingThreshold || 99900) / 100)
        },
        cod: {
          enabled: data.cod?.enabled ?? true,
          minOrderValue: Math.round((data.cod?.minOrderValue || 20000) / 100),
          maxOrderValue: Math.round((data.cod?.maxOrderValue || 1000000) / 100)
        },
        maintenanceMode: data.maintenanceMode || { enabled: false, message: '' }
      });
    } catch (err) {
      setError(err.message || 'Failed to load store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        storeName: settings.storeName,
        tagline: settings.tagline,
        logoUrl: settings.logoUrl,
        faviconUrl: settings.faviconUrl,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        supportHours: settings.supportHours,
        address: settings.address,
        currency: settings.currency,
        taxGst: settings.taxGst,
        shipping: {
          flatRate: Math.round(Number(settings.shipping.flatRate) * 100),
          freeShippingThreshold: Math.round(Number(settings.shipping.freeShippingThreshold) * 100)
        },
        cod: {
          enabled: settings.cod.enabled,
          minOrderValue: Math.round(Number(settings.cod.minOrderValue) * 100),
          maxOrderValue: Math.round(Number(settings.cod.maxOrderValue) * 100)
        },
        maintenanceMode: settings.maintenanceMode
      };

      await cmsService.updateAdminSettings(payload);
      setSuccessMsg('Store settings updated successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
            <Settings className="w-6 h-6 text-slate-700" />
            Storefront Settings & Business Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Control brand identity, legal GST identification, shipping tariffs, COD limits, and emergency maintenance.
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

      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
          <span className="ml-3 text-sm text-gray-500">Loading store settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. General Identity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Store className="w-5 h-5 text-indigo-600" />
              General Brand Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline / Mission</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Cloudinary / CDN)</label>
                <input
                  type="text"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../logo.png"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
                <input
                  type="text"
                  value={settings.faviconUrl}
                  onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../favicon.ico"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  Support Phone
                </label>
                <input
                  type="text"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Hours</label>
                <input
                  type="text"
                  value={settings.supportHours}
                  onChange={(e) => setSettings({ ...settings, supportHours: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Taxation & Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shipping Policy */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
                <Truck className="w-5 h-5 text-emerald-600" />
                Shipping Policy Tariffs
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard Flat Shipping Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.shipping.flatRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shipping: { ...settings.shipping, flatRate: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Default is ₹49 across all serviceable PIN codes in India.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.shipping.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      shipping: { ...settings.shipping, freeShippingThreshold: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Orders with subtotal at or above this threshold receive free shipping (default ₹999).</p>
              </div>
            </div>

            {/* COD & Tax */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
                <Banknote className="w-5 h-5 text-amber-600" />
                Cash on Delivery (COD) & GSTIN
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="codEnabled"
                  checked={settings.cod.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cod: { ...settings.cod, enabled: e.target.checked }
                    })
                  }
                  className="w-4 h-4 text-amber-600 rounded border-gray-300"
                />
                <label htmlFor="codEnabled" className="text-sm font-medium text-gray-700">
                  Allow Cash on Delivery Payment Method
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min COD Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.cod.minOrderValue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cod: { ...settings.cod, minOrderValue: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max COD Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.cod.maxOrderValue}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        cod: { ...settings.cod, maxOrderValue: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Registered GSTIN</label>
                <input
                  type="text"
                  value={settings.taxGst.gstin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      taxGst: { ...settings.taxGst, gstin: e.target.value }
                    })
                  }
                  placeholder="27AAAAA0000A1Z5"
                  className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Maintenance Mode */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Emergency Maintenance Mode
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintenanceEnabled"
                checked={settings.maintenanceMode.enabled}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMode: { ...settings.maintenanceMode, enabled: e.target.checked }
                  })
                }
                className="w-4 h-4 text-rose-600 rounded border-gray-300"
              />
              <label htmlFor="maintenanceEnabled" className="text-sm font-semibold text-rose-700">
                Activate Storefront Maintenance Mode (Prevents new customer checkout)
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer Maintenance Notice</label>
              <input
                type="text"
                value={settings.maintenanceMode.message}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maintenanceMode: { ...settings.maintenanceMode, message: e.target.value }
                  })
                }
                placeholder="Our store is currently undergoing scheduled improvements..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save All Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AdminSettingsPage;

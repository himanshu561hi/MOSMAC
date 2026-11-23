import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutTemplate,
  Image as ImageIcon,
  HelpCircle,
  Star,
  Sparkles,
  Settings,
  Mail,
  FolderOpen,
  ArrowRight
} from 'lucide-react';

const CMS_MODULES = [
  {
    title: 'Homepage Builder',
    description: 'Customize section ordering, toggle hero banners, featured carousels, and promotional grids.',
    href: '/admin/cms/homepage',
    icon: LayoutTemplate,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
  },
  {
    title: '"What\'s New" Page Manager',
    description: 'Configure section visibility checkboxes (Hero Banner, New Brands, Just Dropped, Exclusives) for the /whats-new page.',
    href: '/admin/cms/whats-new',
    icon: Sparkles,
    color: 'bg-rose-50 text-rose-600 border-rose-200'
  },
  {
    title: 'Hero & Promo Banners',
    description: 'Manage desktop/mobile banner images, campaign schedules, and call-to-action click destinations.',
    href: '/admin/cms/banners',
    icon: ImageIcon,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
  },
  {
    title: 'Store Settings & Policies',
    description: 'Update business identity, GSTIN tax identifiers, flat shipping thresholds, and COD limitations.',
    href: '/admin/settings',
    icon: Settings,
    color: 'bg-slate-50 text-slate-700 border-slate-200'
  },
  {
    title: 'Email & Notification Templates',
    description: 'Customize transactional emails and SMS copy with live variable preview for all customer milestones.',
    href: '/admin/cms/templates',
    icon: Mail,
    color: 'bg-purple-50 text-purple-600 border-purple-200'
  },
  {
    title: 'Media Asset Library',
    description: 'Explore hosted marketing imagery, inspect image dimensions, and safely manage Cloudinary assets.',
    href: '/admin/media',
    icon: FolderOpen,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200'
  }
];

export function AdminCmsDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Content Management System (CMS)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Empower marketing, legal, and operational staff to configure storefront experiences without code deployments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
          >
            Preview Live Storefront
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>

      {/* Grid of CMS Sub-Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CMS_MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.href}
              className="group bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg border ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    Admin Managed
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Manage Module
                <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default AdminCmsDashboardPage;

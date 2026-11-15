import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cmsService } from '../services/cmsService';
import { FileText, ChevronRight, Home, Calendar, Clock, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { SeoHead } from '../components/common/SeoHead';

export function ContentPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError(null);
        const data = await cmsService.getPageBySlug(slug);
        setPage(data);
        if (data?.seoTitle) {
          document.title = data.seoTitle;
        }
      } catch (err) {
        setError(err.message || 'Page not found or unavailable');
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-16">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500 mt-3">Loading page content...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Content Page Not Found</h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          The requested page could not be located or has not yet been published by our editorial team.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
        >
          Return to Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <SeoHead
        title={page.seoTitle || page.title}
        description={page.seoDescription || page.metaDescription || `Read ${page.title} on Aura.`}
        canonicalUrl={`/pages/${page.slug || slug}`}
        ogType="article"
      />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link to="/" className="hover:text-gray-700 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-500">Pages</span>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-gray-800">{page.title}</span>
      </nav>

      {/* Header */}
      <header className="border-b border-gray-200 pb-6 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          {page.title}
        </h1>
        {page.seoDescription && (
          <p className="text-base text-gray-600 max-w-2xl leading-relaxed">
            {page.seoDescription}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
          {page.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Published: {new Date(page.publishedAt).toLocaleDateString()}
            </span>
          )}
          {page.updatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last Updated: {new Date(page.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </header>

      {/* Featured Banner (if any) */}
      {page.featuredImageUrl && (
        <div className="rounded-xl overflow-hidden shadow-sm aspect-[21/9] bg-gray-100">
          <img
            src={page.featuredImageUrl}
            alt={page.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Sanitized HTML Body */}
      <article
        className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-emerald-600 hover:prose-a:text-emerald-700 prose-img:rounded-xl text-gray-800 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
}

export default ContentPage;

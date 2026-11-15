import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Alert from '@/components/common/Alert';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  Image as ImageIcon,
  Sliders,
  Layers,
  Sparkles,
  Check,
  Star,
  Info
} from 'lucide-react';

export function AdminProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Reference lists
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categoryAttributes, setCategoryAttributes] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(!isEditMode);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [badges, setBadges] = useState([]);
  const [badgeInput, setBadgeInput] = useState('');

  // Images: [{ url, alt, isPrimary, displayOrder }]
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');

  // Dynamic Category Attributes: [{ code, value, unit }]
  const [productAttributes, setProductAttributes] = useState({});

  // Variants: [{ title, sku, attributes, sellingPriceRupees, mrpRupees, stockQuantity, lowStockThreshold, status }]
  const [variants, setVariants] = useState([
    {
      title: 'Standard',
      sku: '',
      attributes: {},
      sellingPriceRupees: '',
      mrpRupees: '',
      stockQuantity: 10,
      lowStockThreshold: 5,
      status: 'active'
    }
  ]);

  // SEO
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  // Load Categories & Brands
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, brs] = await Promise.all([
          adminCatalogueService.getCategories(false),
          adminCatalogueService.getBrands('')
        ]);
        setCategories(cats);
        setBrands(brs);

        if (!isEditMode && cats.length > 0) {
          setCategoryId(cats[0]._id);
        }
        if (!isEditMode && brs.length > 0) {
          setBrandId(brs[0]._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load catalogue options');
      }
    }
    loadMeta();
  }, [isEditMode]);

  // Load Category Attributes whenever categoryId changes
  useEffect(() => {
    if (!categoryId) {
      setCategoryAttributes([]);
      return;
    }
    async function fetchAttrs() {
      try {
        const attrs = await adminCatalogueService.getAttributesByCategory(categoryId);
        setCategoryAttributes(attrs);
      } catch (err) {
        console.error('Failed to fetch category attributes:', err);
      }
    }
    fetchAttrs();
  }, [categoryId]);

  // Load Existing Product if Edit Mode
  useEffect(() => {
    if (!isEditMode) return;

    async function loadProduct() {
      setIsLoading(true);
      setError('');
      try {
        const prod = await adminCatalogueService.getProductBySlug(id);
        if (!prod) throw new Error('Product not found');

        setTitle(prod.title || '');
        setSlug(prod.slug || '');
        setDescription(prod.description || '');
        setCategoryId(prod.categoryId?._id || prod.categoryId || '');
        setBrandId(prod.brandId?._id || prod.brandId || '');
        setStatus(prod.status || 'draft');
        setIsFeatured(Boolean(prod.isFeatured));
        setBadges(prod.badges || []);
        setImages(prod.images || []);

        // Dynamic Attributes map
        const attrMap = {};
        if (prod.attributes && Array.isArray(prod.attributes)) {
          prod.attributes.forEach((a) => {
            attrMap[a.code] = a.value;
          });
        }
        setProductAttributes(attrMap);

        // Variants (convert integer paise back to rupees for UI)
        if (prod.variants && prod.variants.length > 0) {
          setVariants(
            prod.variants.map((v) => ({
              title: v.title || 'Standard',
              sku: v.sku || '',
              attributes: v.attributes instanceof Map ? Object.fromEntries(v.attributes) : (v.attributes || {}),
              sellingPriceRupees: (((v.price !== undefined ? v.price : v.sellingPrice) || 0) / 100).toFixed(2),
              mrpRupees: (((v.mrp !== undefined ? v.mrp : 0)) / 100).toFixed(2),
              stockQuantity: v.stockQuantity ?? 0,
              lowStockThreshold: v.lowStockThreshold ?? 5,
              status: v.isActive === false ? 'inactive' : (v.status || 'active')
            }))
          );
        }

        // SEO
        if (prod.seo) {
          setMetaTitle(prod.seo.metaTitle || '');
          setMetaDescription(prod.seo.metaDescription || '');
          setKeywords((prod.seo.keywords || []).join(', '));
        }
      } catch (err) {
        setError(err.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id, isEditMode]);

  // Title change & slug auto-generation
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (autoSlug) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  // Add Badge
  const handleAddBadge = () => {
    const b = badgeInput.trim();
    if (!b || badges.includes(b)) return;
    setBadges([...badges, b]);
    setBadgeInput('');
  };

  const handleRemoveBadge = (idx) => {
    setBadges(badges.filter((_, i) => i !== idx));
  };

  // Images management
  const handleAddImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    const isFirst = images.length === 0;
    setImages([
      ...images,
      {
        url,
        alt: newImageAlt.trim() || title || 'Product Image',
        isPrimary: isFirst,
        displayOrder: images.length
      }
    ]);
    setNewImageUrl('');
    setNewImageAlt('');
  };

  const handleSetPrimaryImage = (index) => {
    setImages(
      images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    );
  };

  const handleRemoveImage = (index) => {
    const updated = images.filter((_, i) => i !== index);
    if (images[index].isPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setImages(updated);
  };

  // Dynamic Attribute changes
  const handleAttributeChange = (code, val) => {
    setProductAttributes((prev) => ({
      ...prev,
      [code]: val
    }));
  };

  // Variant management
  const handleAddVariant = () => {
    const count = variants.length + 1;
    setVariants([
      ...variants,
      {
        title: `Variant ${count}`,
        sku: `${slug ? slug.toUpperCase().slice(0, 8) : 'PROD'}-V${count}`,
        attributes: {},
        sellingPriceRupees: variants[0]?.sellingPriceRupees || '',
        mrpRupees: variants[0]?.mrpRupees || '',
        stockQuantity: 10,
        lowStockThreshold: 5,
        status: 'active'
      }
    ]);
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      alert('A product must have at least one variant/SKU.');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        return {
          ...v,
          [field]: value
        };
      })
    );
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = {};

    // Validate General
    if (!title.trim()) errors.title = 'Title is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    if (!categoryId) errors.categoryId = 'Category is required';
    if (!brandId) errors.brandId = 'Brand is required';
    if (!description.trim()) errors.description = 'Description is required';

    // Validate Variants
    if (variants.length === 0) {
      errors.variants = 'At least one variant is required';
    }

    const processedVariants = [];
    const skuSet = new Set();

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const sku = (v.sku || '').trim().toUpperCase();
      if (!sku) {
        errors.variants = `Variant #${i + 1} is missing a SKU`;
        break;
      }
      if (skuSet.has(sku)) {
        errors.variants = `Duplicate SKU '${sku}' found in variants`;
        break;
      }
      skuSet.add(sku);

      const sp = parseFloat(v.sellingPriceRupees);
      const mrp = parseFloat(v.mrpRupees);

      if (isNaN(sp) || sp < 0) {
        errors.variants = `Variant '${v.title}' has an invalid selling price`;
        break;
      }
      if (isNaN(mrp) || mrp < 0) {
        errors.variants = `Variant '${v.title}' has an invalid MRP`;
        break;
      }
      if (sp > mrp) {
        errors.variants = `Variant '${v.title}' Selling Price (₹${sp}) cannot exceed MRP (₹${mrp})`;
        break;
      }

      processedVariants.push({
        title: v.title || 'Standard',
        sku,
        attributes: v.attributes || {},
        price: Math.round(sp * 100),       // Integer paise (required by backend)
        sellingPrice: Math.round(sp * 100),// Integer paise (compatibility)
        mrp: Math.round(mrp * 100),         // Integer paise
        costPrice: 0,
        stockQuantity: parseInt(v.stockQuantity, 10) || 0,
        lowStockThreshold: parseInt(v.lowStockThreshold, 10) || 5,
        isActive: v.status !== 'inactive',
        status: v.status || 'active'
      });
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setError(errors.variants || Object.values(errors)[0]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Build attributes payload
    const formattedAttributes = [];
    for (const attrDef of categoryAttributes) {
      const val = productAttributes[attrDef.code];
      if (val !== undefined && val !== null && val !== '') {
        formattedAttributes.push({
          attributeId: attrDef._id,
          code: attrDef.code,
          value: attrDef.type === 'number' ? Number(val) : val,
          unit: attrDef.unit
        });
      } else if (attrDef.isRequired) {
        setError(`Category requires attribute '${attrDef.name}'`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // Process images with correct schema
    const processedImages = images.map((img, idx) => ({
      url: img.url,
      publicId: img.publicId || '',
      alt: img.alt || title || 'Product Image',
      isPrimary: Boolean(img.isPrimary),
      order: img.order !== undefined ? img.order : (img.displayOrder !== undefined ? img.displayOrder : idx)
    }));

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      categoryId,
      brandId,
      status,
      isFeatured,
      badges,
      hasVariants: processedVariants.length > 1,
      images: processedImages,
      attributes: formattedAttributes,
      variants: processedVariants,
      seo: {
        metaTitle: metaTitle.trim() || title.trim(),
        metaDescription: metaDescription.trim() || description.slice(0, 160).trim(),
        keywords: keywords
          ? keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : []
      }
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await adminCatalogueService.updateProduct(id, payload);
      } else {
        await adminCatalogueService.createProduct(payload);
      }
      navigate('/admin/products');
    } catch (err) {
      const details = err?.details || err?.response?.data?.details || err?.response?.data?.error?.details;
      let msg = err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Failed to save product';
      if (Array.isArray(details) && details.length > 0) {
        msg += ': ' + details.map((d) => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ');
      }
      setError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-gray-500">Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isEditMode ? `Edit Product: ${title}` : 'Create New Product'}
            </h1>
            <p className="text-xs text-gray-500">
              Configure product details, category-driven dynamic attributes, and multi-variant SKUs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Saving...
              </div>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Create Product'
            )}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Core Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              General Information
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-500">Publishing Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-gray-300 py-1 px-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="draft">Draft (Private)</option>
                <option value="published">Published (Storefront Live)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Product Title *
              </label>
              <Input
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Ergonomic Office Desk Chair"
                required
              />
              {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    URL Slug *
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSlug}
                      onChange={(e) => setAutoSlug(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    Auto-slug
                  </label>
                </div>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="e.g. ergonomic-office-desk-chair"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Brand *
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Description *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive product specifications, features, materials, and warranty information..."
                className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
              {formErrors.description && (
                <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-800">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                Mark as Featured Product (Highlights on Homepage)
              </label>

              {/* Badges builder */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBadge();
                    }
                  }}
                  placeholder="Add badge (e.g. Bestseller)"
                  className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <Button type="button" size="sm" variant="secondary" onClick={handleAddBadge}>
                  Add
                </Button>
              </div>
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800"
                  >
                    {b}
                    <button
                      type="button"
                      onClick={() => handleRemoveBadge(i)}
                      className="text-emerald-600 hover:text-emerald-950 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Dynamic Category Attributes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Dynamic Category Attributes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configured automatically based on the selected category schema.
              </p>
            </div>
            {categoryAttributes.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                {categoryAttributes.length} attribute{categoryAttributes.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {categoryAttributes.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              Selected category has no custom attributes defined.{' '}
              <Link to="/admin/attributes" className="text-emerald-600 underline font-medium">
                Configure attributes here
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
              {categoryAttributes.map((attr) => (
                <div key={attr.code} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    {attr.name} {attr.isRequired && <span className="text-red-500">*</span>}
                    {attr.unit && <span className="text-gray-400 font-normal ml-1">({attr.unit})</span>}
                  </label>

                  {attr.type === 'select' ? (
                    <select
                      value={productAttributes[attr.code] || ''}
                      onChange={(e) => handleAttributeChange(attr.code, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required={attr.isRequired}
                    >
                      <option value="">Select {attr.name}</option>
                      {attr.options?.map((opt, i) => (
                        <option key={i} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : attr.type === 'multiselect' ? (
                    <div className="border border-gray-200 rounded-lg p-2 bg-gray-50/50 max-h-32 overflow-y-auto space-y-1">
                      {attr.options?.map((opt, i) => {
                        const currentArr = Array.isArray(productAttributes[attr.code])
                          ? productAttributes[attr.code]
                          : [];
                        const checked = currentArr.includes(opt);

                        return (
                          <label key={i} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const nextArr = e.target.checked
                                  ? [...currentArr, opt]
                                  : currentArr.filter((v) => v !== opt);
                                handleAttributeChange(attr.code, nextArr);
                              }}
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : attr.type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={Boolean(productAttributes[attr.code])}
                        onChange={(e) => handleAttributeChange(attr.code, e.target.checked)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      Yes / Enabled
                    </label>
                  ) : (
                    <input
                      type={attr.type === 'number' ? 'number' : 'text'}
                      value={productAttributes[attr.code] ?? ''}
                      onChange={(e) => handleAttributeChange(attr.code, e.target.value)}
                      placeholder={`Enter ${attr.name}`}
                      className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required={attr.isRequired}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Product Gallery & Images */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              Product Image Gallery
            </h2>
            <span className="text-xs text-gray-400">
              {images.length} image{images.length === 1 ? '' : 's'} added
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Paste Image URL (Cloudinary, CDN, or HTTPS image link)..."
              className="flex-1 rounded-lg border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <input
              type="text"
              value={newImageAlt}
              onChange={(e) => setNewImageAlt(e.target.value)}
              placeholder="Alt text (e.g. Front View)"
              className="w-full sm:w-56 rounded-lg border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <Button type="button" variant="secondary" onClick={handleAddImage} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" />
              Add Image
            </Button>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative group rounded-xl border-2 overflow-hidden aspect-square bg-gray-50 ${
                    img.isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-gray-200'
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />

                  {img.isPrimary && (
                    <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                      Primary
                    </span>
                  )}

                  <div className="absolute inset-0 bg-gray-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className="p-1.5 bg-white text-gray-800 rounded-lg hover:text-emerald-600 shadow"
                        title="Set as Primary"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 bg-white text-red-600 rounded-lg hover:bg-red-50 shadow"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Multi-Variant & Pricing Engine (Integer Paise) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Product Variants & Pricing (Paise / INR)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Every SKU supports its own price (selling price ≤ MRP), initial stock, and low-stock alert threshold.
              </p>
            </div>

            <Button type="button" size="sm" onClick={handleAddVariant} className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Add Variant
            </Button>
          </div>

          <div className="space-y-4">
            {variants.map((v, idx) => {
              const sp = parseFloat(v.sellingPriceRupees) || 0;
              const mrp = parseFloat(v.mrpRupees) || 0;
              const discount = mrp > 0 && sp > 0 && mrp > sp ? Math.round(((mrp - sp) / mrp) * 100) : 0;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Variant #{idx + 1}
                    </span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Variant
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                        Variant Title *
                      </label>
                      <input
                        type="text"
                        value={v.title}
                        onChange={(e) => handleVariantChange(idx, 'title', e.target.value)}
                        placeholder="e.g. Standard, 128GB Black, Size XL"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                        SKU Identifier *
                      </label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleVariantChange(idx, 'sku', e.target.value.toUpperCase())}
                        placeholder="e.g. PROD-XL-01"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs font-mono bg-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.sellingPriceRupees}
                        onChange={(e) => handleVariantChange(idx, 'sellingPriceRupees', e.target.value)}
                        placeholder="999.00"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                        MRP (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.mrpRupees}
                        onChange={(e) => handleVariantChange(idx, 'mrpRupees', e.target.value)}
                        placeholder="1499.00"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                        Stock Units *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={v.stockQuantity}
                        onChange={(e) => handleVariantChange(idx, 'stockQuantity', e.target.value)}
                        placeholder="50"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <div className="flex items-center gap-4">
                      {discount > 0 ? (
                        <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {discount}% Discount off MRP
                        </span>
                      ) : sp > mrp && mrp > 0 ? (
                        <span className="text-red-600 font-semibold">
                          Error: Selling price cannot exceed MRP
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Low Stock Alert:</span>
                      <input
                        type="number"
                        min="0"
                        value={v.lowStockThreshold}
                        onChange={(e) => handleVariantChange(idx, 'lowStockThreshold', e.target.value)}
                        className="w-16 rounded border border-gray-300 py-0.5 px-2 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 5: Search Engine Optimization (SEO) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Search Engine Optimization (SEO)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customize meta tags for Google indexing and social media open graph previews.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Meta Title
              </label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || 'Product Meta Title'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Meta Description
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief summary for search engine results..."
                className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Meta Keywords (Comma-separated)
              </label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="office chair, ergonomic, mesh chair, lumbar support"
              />
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/admin/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                Saving...
              </div>
            ) : isEditMode ? (
              'Save Product Changes'
            ) : (
              'Publish Product'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdminProductFormPage;


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminCatalogueService } from '@/features/admin/catalogueService';
import cmsService from '@/services/cmsService';
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
  Info,
  UploadCloud,
  Loader2,
  Link2
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
  const [weight, setWeight] = useState(''); // Package weight in grams
  const [categoryId, setCategoryId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState('draft');
  const [isFeatured, setIsFeatured] = useState(false);
  const [badges, setBadges] = useState([]);
  const [badgeInput, setBadgeInput] = useState('');

  // Images: [{ url, alt, isPrimary, displayOrder, publicId }]
  const [images, setImages] = useState([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState('file'); // 'file' or 'url'
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');

  // Dynamic Category Attributes: [{ code, value, unit }]
  const [productAttributes, setProductAttributes] = useState({});

  // Variants: [{ title, sku, weight, attributes, sellingPriceRupees, mrpRupees, stockQuantity, lowStockThreshold, status }]
  const [variants, setVariants] = useState([
    {
      title: 'Standard',
      sku: '',
      weight: '',
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
          const rootCats = cats.filter((c) => !c.parentId);
          const defaultCatId = rootCats[0]?._id || cats[0]._id;
          setSelectedParentId(defaultCatId);
          setSelectedSubId('');
          setCategoryId(defaultCatId);
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
        setWeight(prod.weight !== undefined && prod.weight !== null ? prod.weight : (prod.variants?.[0]?.weight ?? ''));
        
        const rawCatId = prod.categoryId?._id || prod.categoryId || '';
        setCategoryId(rawCatId);

        // Resolve parent vs subcategory
        const targetCat = categories.find((c) => c._id === rawCatId);
        if (targetCat && targetCat.parentId) {
          setSelectedParentId(targetCat.parentId);
          setSelectedSubId(targetCat._id);
        } else {
          setSelectedParentId(rawCatId);
          setSelectedSubId('');
        }
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
              weight: v.weight !== undefined && v.weight !== null ? v.weight : (prod.weight ?? ''),
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
      const generatedSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);

      // Auto-populate default variant SKU if unmodified
      if (!isEditMode && variants.length === 1) {
        const cleanSkuBase = generatedSlug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
        if (cleanSkuBase) {
          setVariants((prev) => [
            {
              ...prev[0],
              sku: `${cleanSkuBase}-01`
            }
          ]);
        }
      }
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

  // Multiple Images management via File Upload / Cloudinary
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadError('');
    setIsUploadingImages(true);

    try {
      const uploaded = await cmsService.uploadMediaFiles(files, 'ecommerce/products');
      if (Array.isArray(uploaded) && uploaded.length > 0) {
        setImages((prev) => {
          const hasExistingPrimary = prev.some((img) => img.isPrimary);
          const newFormatted = uploaded.map((item, idx) => ({
            url: item.url,
            publicId: item.publicId || '',
            alt: item.alt || title || `Product Image ${prev.length + idx + 1}`,
            isPrimary: !hasExistingPrimary && idx === 0,
            displayOrder: prev.length + idx
          }));
          return [...prev, ...newFormatted];
        });
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload images to Cloudinary');
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploadError('');
    setIsUploadingImages(true);

    try {
      const uploaded = await cmsService.uploadMediaFiles(files, 'ecommerce/products');
      if (Array.isArray(uploaded) && uploaded.length > 0) {
        setImages((prev) => {
          const hasExistingPrimary = prev.some((img) => img.isPrimary);
          const newFormatted = uploaded.map((item, idx) => ({
            url: item.url,
            publicId: item.publicId || '',
            alt: item.alt || title || `Product Image ${prev.length + idx + 1}`,
            isPrimary: !hasExistingPrimary && idx === 0,
            displayOrder: prev.length + idx
          }));
          return [...prev, ...newFormatted];
        });
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload images to Cloudinary');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleAddImageFromUrl = (e) => {
    if (e) e.preventDefault();
    const url = newImageUrl.trim();
    if (!url) return;
    setUploadError('');

    try {
      new URL(url);
    } catch {
      setUploadError('Please enter a valid image URL (e.g. https://images.unsplash.com/...)');
      return;
    }

    setImages((prev) => {
      const hasExistingPrimary = prev.some((img) => img.isPrimary);
      return [
        ...prev,
        {
          url,
          publicId: '',
          alt: newImageAlt.trim() || title || `Product Image ${prev.length + 1}`,
          isPrimary: !hasExistingPrimary,
          displayOrder: prev.length
        }
      ];
    });

    setNewImageUrl('');
    setNewImageAlt('');
  };

  const handleUpdateImageAlt = (index, alt) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img))
    );
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
    if (images[index]?.isPrimary && updated.length > 0) {
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

  const rootCategories = categories.filter((c) => !c.parentId);
  const availableSubcategories = categories.filter((c) => c.parentId === selectedParentId);
  const selectedParentCategoryObj = categories.find((c) => c._id === selectedParentId);

  const handleParentCategoryChange = (parentId) => {
    setSelectedParentId(parentId);
    setSelectedSubId('');
    setCategoryId(parentId);
  };

  const handleSubCategoryChange = (subId) => {
    setSelectedSubId(subId);
    setCategoryId(subId || selectedParentId);
  };

  // Variant management
  const handleAddVariant = () => {
    const count = variants.length + 1;
    setVariants([
      ...variants,
      {
        title: `Variant ${count}`,
        sku: `${slug ? slug.toUpperCase().slice(0, 8) : 'PROD'}-V${count}`,
        weight: weight || variants[0]?.weight || '',
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
    if (!title.trim() || title.trim().length < 3) errors.title = 'Title must be between 3 and 200 characters';
    if (!slug.trim() || slug.trim().length < 3) errors.slug = 'Slug must be at least 3 characters';
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
      if (sku.length < 2) {
        errors.variants = `Variant #${i + 1} SKU '${sku}' must be at least 2 characters`;
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

      const varWeight = parseFloat(v.weight) >= 0 ? parseFloat(v.weight) : (parseFloat(weight) || 0);

      processedVariants.push({
        title: v.title || 'Standard',
        sku,
        weight: varWeight,
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

    const topWeight = parseFloat(weight) >= 0 ? parseFloat(weight) : (processedVariants[0]?.weight || 0);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      weight: topWeight,
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
        const detailsStr = details.map((d) => `${d.field ? `${d.field}: ` : ''}${d.message}`).join(', ');
        if (!msg.includes(detailsStr)) {
          msg += ': ' + detailsStr;
        }
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 uppercase">
                        Category *
                      </label>
                      <Link
                        to="/admin/categories"
                        target="_blank"
                        className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium hover:underline flex items-center gap-1"
                        title="Opens Category & Subcategory manager in new tab"
                      >
                        + Manage / Add
                      </Link>
                    </div>
                    <select
                      value={selectedParentId}
                      onChange={(e) => handleParentCategoryChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      required
                    >
                      <option value="" disabled>
                        Select Category
                      </option>
                      {rootCategories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory Selector: Completely Optional */}
                  {selectedParentId && availableSubcategories.length > 0 ? (
                    <div className="animate-in fade-in duration-150">
                      <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                        Subcategory <span className="text-gray-400 font-normal lowercase">(optional)</span>
                      </label>
                      <select
                        value={selectedSubId}
                        onChange={(e) => handleSubCategoryChange(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">
                          None (Assign directly to {selectedParentCategoryObj?.name})
                        </option>
                        {availableSubcategories.map((sub) => (
                          <option key={sub._id} value={sub._id}>
                            ↳ {sub.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Leave as 'None' if this product doesn't need a subcategory.
                      </p>
                    </div>
                  ) : selectedParentId ? (
                    <div className="text-[11px] text-gray-500 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200">
                      <span className="font-semibold text-gray-700">✓ Direct Category:</span>{' '}
                      <strong>{selectedParentCategoryObj?.name}</strong> has no subcategories. Product will be listed directly under this category.
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Brand *
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    required
                  >
                    <option value="" disabled>Select Brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      Package Weight (Grams)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={weight}
                      onChange={(e) => {
                        const val = e.target.value;
                        setWeight(val);
                        setVariants((prev) =>
                          prev.map((v, i) => (i === 0 && !v.weight ? { ...v, weight: val } : v))
                        );
                      }}
                      placeholder="e.g. 250 for 250g, 1000 for 1kg"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Shipping weight in grams (g) used for courier calculation
                    </p>
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

        {/* Card 3: Product Gallery & Images (Multiple Files & URL Links) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                Product Image Gallery
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add multiple product images via direct file upload or image URLs.
              </p>
            </div>

            {/* Upload Method Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setImageUploadMode('file')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  imageUploadMode === 'file'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload File(s)
              </button>
              <button
                type="button"
                onClick={() => setImageUploadMode('url')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  imageUploadMode === 'url'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                Add via Link / URL
              </button>
            </div>
          </div>

          {uploadError && (
            <Alert type="error" message={uploadError} onClose={() => setUploadError('')} />
          )}

          {/* Mode 1: Drag & Drop Multiple File Upload Box */}
          {imageUploadMode === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-gray-200 hover:border-emerald-400 bg-gray-50/50'
              }`}
            >
              <input
                type="file"
                id="product-images-input"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploadingImages}
              />

              {isUploadingImages ? (
                <div className="flex flex-col items-center justify-center space-y-3 py-3">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-sm font-semibold text-gray-800">
                    Uploading files to Cloudinary...
                  </p>
                  <p className="text-xs text-gray-400">Optimizing resolution and securing asset URLs</p>
                </div>
              ) : (
                <label
                  htmlFor="product-images-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2.5"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-200/80 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      <span className="text-emerald-600 underline">Click to upload</span> or drag and drop multiple images
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Upload high-resolution PNG, JPG, WEBP, or AVIF (Up to 10MB each)
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Multiple files supported
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Mode 2: Add by URL Link */}
          {imageUploadMode === 'url' && (
            <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste Image URL (e.g. https://images.unsplash.com/... or Cloudinary URL)"
                  className="flex-1 rounded-xl border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <input
                  type="text"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  placeholder="Alt text (e.g. Front View)"
                  className="w-full sm:w-56 rounded-xl border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddImageFromUrl}
                  disabled={!newImageUrl.trim()}
                  className="whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Image Link
                </Button>
              </div>
              <p className="text-[11px] text-gray-500">
                Tip: Enter any direct public image link (CDN, HTTPS, Cloudinary). You can add multiple image links one by one.
              </p>
            </div>
          )}

          {/* Uploaded Images Gallery Grid */}
          {images.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Uploaded Product Images ({images.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-2xl border-2 overflow-hidden bg-white shadow-2xs flex flex-col transition-all ${
                      img.isPrimary
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Image Preview Box */}
                    <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
                      <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />

                      {img.isPrimary && (
                        <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                          <Star className="w-3 h-3 fill-white" /> Primary Image
                        </span>
                      )}

                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="p-1.5 bg-white/90 backdrop-blur-xs text-gray-700 hover:text-emerald-700 hover:bg-white rounded-xl shadow-xs transition-colors"
                            title="Set as Primary Cover Image"
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1.5 bg-white/90 backdrop-blur-xs text-rose-600 hover:bg-rose-50 rounded-xl shadow-xs transition-colors"
                          title="Remove image"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Alt Text Input */}
                    <div className="p-2.5 bg-gray-50/70 border-t border-gray-100">
                      <input
                        type="text"
                        value={img.alt || ''}
                        onChange={(e) => handleUpdateImageAlt(idx, e.target.value)}
                        placeholder="Image Alt text (e.g. Front View)"
                        className="w-full text-xs bg-white rounded-lg border border-gray-200 px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
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
                        Weight (g)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={v.weight !== undefined ? v.weight : ''}
                        onChange={(e) => handleVariantChange(idx, 'weight', e.target.value)}
                        placeholder="e.g. 250"
                        className="w-full rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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


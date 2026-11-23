import React, { useEffect } from 'react';

const DEFAULT_BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (import.meta.env.VITE_SITE_URL || 'https://mosmac.netlify.app');

const DEFAULT_STORE_NAME = import.meta.env.VITE_APP_NAME || 'MOSMAC';
const DEFAULT_TAGLINE = 'Luxury & Professional Cosmetics & Makeup Store';
const DEFAULT_DESCRIPTION = 'Shop authentic beauty cosmetics, makeup kits, and skincare essentials with express delivery, cash on delivery, and 100% genuine brand guarantee.';
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&h=630&q=80';

/**
 * Safely escape JSON-LD data to prevent script injection vulnerabilities.
 */
function safeSerializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Upsert or remove a <meta> tag by name or property attribute.
 */
function setMetaTag(attrName, attrValue, content) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!content) {
    if (element) element.remove();
    return;
  }

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Upsert or remove a <link rel="..."> tag.
 */
function setLinkTag(rel, href) {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    if (element) element.remove();
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Reactive SEO Head Manager component.
 * Dynamically injects title, meta tags, OpenGraph, Twitter Cards, canonical URLs, and JSON-LD structured data.
 */
export function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  robots = 'index, follow',
  jsonLd = null
}) {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Page Title
    const formattedTitle = title
      ? (title.includes(DEFAULT_STORE_NAME) ? title : `${title} | ${DEFAULT_STORE_NAME}`)
      : `${DEFAULT_STORE_NAME} | ${DEFAULT_TAGLINE}`;
    document.title = formattedTitle;

    // 2. Canonical URL resolution
    const resolvedCanonical = canonicalUrl
      ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${DEFAULT_BASE_URL}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}`)
      : `${DEFAULT_BASE_URL}${window.location.pathname}`;

    setLinkTag('canonical', resolvedCanonical);

    // 3. Standard Meta Description & Robots Directives
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);

    // 4. OpenGraph Metadata (Facebook, LinkedIn, Slack, WhatsApp)
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', resolvedCanonical);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:site_name', DEFAULT_STORE_NAME);

    // 5. Twitter / X Card Metadata
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 6. Structured Data (JSON-LD)
    const scriptId = 'seo-structured-data';
    let scriptElement = document.getElementById(scriptId);

    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = scriptId;
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = safeSerializeJsonLd(jsonLd);
    } else if (scriptElement) {
      scriptElement.remove();
    }
  }, [title, description, canonicalUrl, ogImage, ogType, robots, jsonLd]);

  return null;
}

// ============================================================================
// STRUCTURED DATA SCHEMA BUILDERS (Adhering to Schema.org and Google Search Guidelines)
// ============================================================================

export function buildOrganizationSchema({
  name = DEFAULT_STORE_NAME,
  url = DEFAULT_BASE_URL,
  logo = `${DEFAULT_BASE_URL}/logo.png`,
  email = 'support@aurastore.in',
  phone = '+91-9876543210'
} = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: phone,
      email,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi']
    }
  };
}

export function buildWebSiteSchema({
  name = DEFAULT_STORE_NAME,
  url = DEFAULT_BASE_URL,
  searchPath = '/search?q='
} = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}${searchPath}{search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

export function buildProductSchema({ product, canonicalUrl }) {
  if (!product) return null;

  const defaultVariant = product.variants?.[0] || {};
  const priceRupees = (defaultVariant.price || product.basePrice || 0) / 100;
  const isAvailable = (defaultVariant.stockQuantity ?? product.stock ?? 1) > 0;
  const imageUrl = product.images?.[0] || DEFAULT_OG_IMAGE;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description?.replace(/<[^>]+>/g, '').substring(0, 300) || DEFAULT_DESCRIPTION,
    image: imageUrl,
    sku: defaultVariant.sku || product.slug,
    brand: {
      '@type': 'Brand',
      name: product.brandId?.name || product.brand?.name || 'Aura'
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl || `${DEFAULT_BASE_URL}/product/${product.slug}`,
      priceCurrency: 'INR',
      price: priceRupees.toFixed(2),
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  };

  // Only attach aggregateRating if genuine approved reviews exist
  if (product.ratings?.count > 0 && product.ratings?.average > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.ratings.average).toFixed(1),
      reviewCount: product.ratings.count,
      bestRating: '5',
      worstRating: '1'
    };
  }

  return schema;
}

export function buildBreadcrumbSchema(items = []) {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${DEFAULT_BASE_URL}${item.url}`
    }))
  };
}

export function buildFaqSchema(faqs = []) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

export default SeoHead;

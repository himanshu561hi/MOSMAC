import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { ContentPage } from '../models/ContentPage.js';
import env from '../config/env.js';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function formatDate(date) {
  return (date ? new Date(date) : new Date()).toISOString().split('T')[0];
}

/**
 * Generate XML Sitemap dynamically from published catalog and CMS records.
 */
export async function getSitemapXml(req, res, next) {
  try {
    const baseUrl = (env.FRONTEND_URL || 'https://aura-storefront.netlify.app').replace(/\/+$/, '');
    const now = formatDate(new Date());

    // 1. Static Core Storefront Routes
    const staticUrls = [
      { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: now },
      { loc: `${baseUrl}/products`, changefreq: 'daily', priority: '0.9', lastmod: now },
      { loc: `${baseUrl}/faqs`, changefreq: 'weekly', priority: '0.7', lastmod: now }
    ];

    // 2. Published Categories
    const categories = await Category.find({ isActive: true }).select('slug updatedAt').lean();
    const categoryUrls = categories.map((cat) => ({
      loc: `${baseUrl}/category/${escapeXml(cat.slug)}`,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: formatDate(cat.updatedAt)
    }));

    // 3. Published Products
    const products = await Product.find({ status: 'published' }).select('slug updatedAt').lean();
    const productUrls = products.map((prod) => ({
      loc: `${baseUrl}/product/${escapeXml(prod.slug)}`,
      changefreq: 'daily',
      priority: '0.8',
      lastmod: formatDate(prod.updatedAt)
    }));

    // 4. Published Content & Policy Pages
    const pages = await ContentPage.find({ status: 'published' }).select('slug updatedAt').lean();
    const pageUrls = pages.map((page) => ({
      loc: `${baseUrl}/pages/${escapeXml(page.slug)}`,
      changefreq: 'weekly',
      priority: '0.6',
      lastmod: formatDate(page.updatedAt)
    }));

    // Combine all indexed public URLs (excluding private / admin / checkout / account)
    const allUrls = [...staticUrls, ...categoryUrls, ...productUrls, ...pageUrls];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const item of allUrls) {
      xml += '  <url>\n';
      xml += `    <loc>${item.loc}</loc>\n`;
      xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
      xml += `    <priority>${item.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(xml);
  } catch (error) {
    next(error);
  }
}

/**
 * Generate robots.txt directives protecting private areas from crawler indexing.
 */
export function getRobotsTxt(req, res) {
  const baseUrl = (env.FRONTEND_URL || 'https://aura-storefront.netlify.app').replace(/\/+$/, '');

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/*',
    'Disallow: /account',
    'Disallow: /account/*',
    'Disallow: /checkout',
    'Disallow: /cart',
    'Disallow: /wishlist',
    'Disallow: /payment-failure',
    'Disallow: /order-confirmation/*',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join('\n');

  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  return res.status(200).send(robots);
}

export default {
  getSitemapXml,
  getRobotsTxt
};
